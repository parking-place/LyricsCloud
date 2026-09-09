#!/usr/bin/env node
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PURPOSE = "auth-bootstrap";
const NORMALIZATION_VERSION = "nfkc-trim-lower-v1";

export async function migrateAllowlist(options) {
  const sourcePath = resolve(options.source);
  const environment = parseEnvironment(options.environment);
  const sourceInfo = await stat(sourcePath);
  if (!sourceInfo.isFile() || (sourceInfo.mode & 0o077) !== 0) throw new Error("ALLOWLIST_SOURCE_PERMISSIONS_INVALID");
  const source = await readFile(sourcePath, "utf8");
  const keyring = parseKeyring(await readFile(resolve(options.keyring), "utf8"));
  const existing = parseHashedRecords(source, environment);
  if (existing) {
    if (existing.some((record) => !keyring.keys.some((entry) => entry.kid === record.kid))) {
      throw new Error("ALLOWLIST_RECORD_KEY_MISSING");
    }
    return { inputCount: existing.length, uniqueCount: existing.length, alreadyHashed: true, changed: false };
  }

  const emails = parsePlainEmails(source);
  const active = keyring.keys.find((entry) => entry.kid === keyring.activeKid);
  if (!active) throw new Error("ALLOWLIST_ACTIVE_KEY_MISSING");
  const key = decodeKey(active.key, "ALLOWLIST_HMAC_KEY_INVALID");
  const records = [...new Set(emails)].sort().map((email) => ({
    formatVersion: 1,
    environment,
    purpose: PURPOSE,
    normalizationVersion: NORMALIZATION_VERSION,
    kid: active.kid,
    digest: digestEmail(email, environment, key),
    state: "active"
  }));
  if (options.dryRun) return { inputCount: emails.length, uniqueCount: records.length, alreadyHashed: false, changed: false };
  if (!options.apply || !options.backupKey || !options.backupOutput) throw new Error("ALLOWLIST_APPLY_ARGUMENTS_REQUIRED");

  const backupKey = decodeKey((await readFile(resolve(options.backupKey), "utf8")).trim(), "ALLOWLIST_BACKUP_KEY_INVALID");
  const sourceSha256 = createHash("sha256").update(source, "utf8").digest("hex");
  const backup = sealBackup(source, environment, sourceSha256, backupKey);
  await mkdir(dirname(resolve(options.backupOutput)), { recursive: true, mode: 0o700 });
  await writeExclusive(resolve(options.backupOutput), `${JSON.stringify(backup)}\n`, 0o600);

  const hashedSource = [
    "# LyricsCloud HMAC allowlist v1. Raw email addresses are not stored here.",
    ...records.map((record) => JSON.stringify(record)),
    ""
  ].join("\n");
  await writeAtomic(sourcePath, hashedSource, 0o600);
  return { inputCount: emails.length, uniqueCount: records.length, alreadyHashed: false, changed: true, sourceSha256 };
}

export async function restoreAllowlist(options) {
  if (options.confirm !== "restore-plaintext") throw new Error("ALLOWLIST_RESTORE_CONFIRM_REQUIRED");
  const environment = parseEnvironment(options.environment);
  const backup = JSON.parse(await readFile(resolve(options.backupInput), "utf8"));
  const key = decodeKey((await readFile(resolve(options.backupKey), "utf8")).trim(), "ALLOWLIST_BACKUP_KEY_INVALID");
  const plaintext = openBackup(backup, environment, key);
  parsePlainEmails(plaintext);
  await writeAtomic(resolve(options.target), plaintext, 0o600);
  return { restoredSha256: createHash("sha256").update(plaintext, "utf8").digest("hex") };
}

export function digestEmail(value, environment, key) {
  const email = normalizeEmail(value);
  if (!validEmail(email)) throw new Error("ALLOWLIST_EMAIL_INVALID");
  return createHmac("sha256", key)
    .update(`lyricscloud|${PURPOSE}|v1|${environment}|${NORMALIZATION_VERSION}|${email}`, "utf8")
    .digest("hex");
}

export function parsePlainEmails(source) {
  const emails = source.split(/\r?\n/u).flatMap((line) => {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith("#") ? [] : trimmed.split(",").map(normalizeEmail).filter(Boolean);
  });
  if (!emails.length || emails.some((email) => !validEmail(email))) throw new Error("ALLOWLIST_PLAINTEXT_INVALID");
  return emails;
}

function parseHashedRecords(source, environment) {
  const content = source.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  if (!content.length || !content[0].startsWith("{")) return null;
  const records = content.map((line) => JSON.parse(line));
  if (records.some((record) => record?.formatVersion !== 1 || record.environment !== environment
    || record.purpose !== PURPOSE || record.normalizationVersion !== NORMALIZATION_VERSION
    || !/^[A-Za-z0-9._-]{1,64}$/u.test(record.kid ?? "") || !/^[0-9a-f]{64}$/u.test(record.digest ?? "")
    || !["active", "revoked"].includes(record.state))) throw new Error("ALLOWLIST_HASH_RECORD_INVALID");
  const identities = new Set(records.map((record) => `${record.environment}\u0000${record.kid}\u0000${record.digest}`));
  if (identities.size !== records.length) throw new Error("ALLOWLIST_HASH_RECORD_DUPLICATE");
  return records;
}

function parseKeyring(source) {
  const value = JSON.parse(source);
  if (value?.formatVersion !== 1 || !/^[A-Za-z0-9._-]{1,64}$/u.test(value.activeKid ?? "")
    || !Array.isArray(value.keys) || value.keys.length < 1 || value.keys.length > 8) throw new Error("ALLOWLIST_KEYRING_INVALID");
  const kids = new Set();
  for (const entry of value.keys) {
    if (!/^[A-Za-z0-9._-]{1,64}$/u.test(entry?.kid ?? "") || kids.has(entry.kid)
      || !/^[A-Za-z0-9_-]{43}$/u.test(entry.key ?? "") || Buffer.from(entry.key, "base64url").length !== 32
      || (entry.notAfter !== undefined && !Number.isFinite(Date.parse(entry.notAfter)))) throw new Error("ALLOWLIST_KEYRING_INVALID");
    kids.add(entry.kid);
  }
  const active = value.keys.find((entry) => entry.kid === value.activeKid);
  if (!active || active.notAfter !== undefined) throw new Error("ALLOWLIST_KEYRING_INVALID");
  return value;
}

function sealBackup(plaintext, environment, sourceSha256, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`lyricscloud|auth-allowlist-backup|v1|${environment}|${sourceSha256}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { formatVersion: 1, algorithm: "A256GCM", environment, sourceSha256,
    nonce: nonce.toString("base64url"), ciphertext: ciphertext.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") };
}

function openBackup(value, environment, key) {
  if (value?.formatVersion !== 1 || value.algorithm !== "A256GCM" || value.environment !== environment
    || !/^[0-9a-f]{64}$/u.test(value.sourceSha256 ?? "")) throw new Error("ALLOWLIST_BACKUP_INVALID");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.nonce, "base64url"));
    decipher.setAAD(Buffer.from(`lyricscloud|auth-allowlist-backup|v1|${environment}|${value.sourceSha256}`, "utf8"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64url")), decipher.final()]).toString("utf8");
    if (createHash("sha256").update(plaintext, "utf8").digest("hex") !== value.sourceSha256) throw new Error();
    return plaintext;
  } catch { throw new Error("ALLOWLIST_BACKUP_AUTHENTICATION_FAILED"); }
}

async function writeExclusive(path, content, mode) {
  const handle = await open(path, "wx", mode);
  try { await handle.writeFile(content, "utf8"); await handle.sync(); }
  finally { await handle.close(); }
}

async function writeAtomic(path, content, mode) {
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeExclusive(temporary, content, mode);
    await chmod(temporary, mode);
    await rename(temporary, path);
    const directory = await open(dirname(path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await rm(temporary, { force: true }).catch(() => undefined); }
}

function decodeKey(value, code) {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) throw new Error(code);
  const key = Buffer.from(value, "base64url");
  if (key.length !== 32) throw new Error(code);
  return key;
}

function normalizeEmail(value) { return value.trim().normalize("NFKC").toLowerCase(); }
function validEmail(value) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value); }
function parseEnvironment(value) {
  if (!["development", "release", "test"].includes(value)) throw new Error("ALLOWLIST_ENVIRONMENT_INVALID");
  return value;
}

function parseArguments(args) {
  const values = new Map(); let mode;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (["--dry-run", "--apply", "--restore"].includes(arg)) { if (mode) throw new Error("ALLOWLIST_ARGUMENTS_INVALID"); mode = arg; continue; }
    const next = args[index + 1];
    if (!arg?.startsWith("--") || next === undefined || next.startsWith("--")) throw new Error("ALLOWLIST_ARGUMENTS_INVALID");
    values.set(arg, next); index += 1;
  }
  if (mode === "--restore") return { restore: true, backupInput: required(values, "--backup-input"), backupKey: required(values, "--backup-key"),
    target: required(values, "--target"), environment: required(values, "--environment"), confirm: values.get("--confirm") };
  if (mode !== "--dry-run" && mode !== "--apply") throw new Error("ALLOWLIST_ARGUMENTS_INVALID");
  return { dryRun: mode === "--dry-run", apply: mode === "--apply", source: required(values, "--source"),
    keyring: required(values, "--keyring"), environment: required(values, "--environment"),
    backupKey: values.get("--backup-key"), backupOutput: values.get("--backup-output") };
}

function required(values, name) { const value = values.get(name); if (!value) throw new Error("ALLOWLIST_ARGUMENTS_INVALID"); return value; }
function isDirect() { return process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href; }

if (isDirect()) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = options.restore ? await restoreAllowlist(options) : await migrateAllowlist(options);
    process.stdout.write(`input=${result.inputCount ?? 0} unique=${result.uniqueCount ?? 0} changed=${result.changed ?? false} restored=${Boolean(result.restoredSha256)}\n`);
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message) ? error.message : "ALLOWLIST_MIGRATION_FAILED";
    process.stderr.write(`${code}\n`); process.exitCode = 1;
  }
}
