#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = parse(process.argv.slice(2));
const keyringPath = resolve(args.keyring ?? ".private/keys/auth_allowlist_hmac_keyring");
const backupKeyPath = resolve(args.backupKey ?? ".private/keys/auth_allowlist_migration_backup_key");
const kid = args.kid ?? "";
if (!/^[A-Za-z0-9._-]{1,64}$/u.test(kid)) throw new Error("ALLOWLIST_KID_INVALID");
if (!args.rotate && args.oldNotAfter) throw new Error("ALLOWLIST_ARGUMENTS_INVALID");
await mkdir(dirname(keyringPath), { recursive: true, mode: 0o700 });
await mkdir(dirname(backupKeyPath), { recursive: true, mode: 0o700 });

const keyringSource = await readOptionalSecureFile(keyringPath);
let keyring = keyringSource === null ? null : parseKeyring(keyringSource);
if (!keyring) {
  if (args.rotate) throw new Error("ALLOWLIST_ROTATION_SOURCE_MISSING");
  keyring = { formatVersion: 1, activeKid: kid, keys: [{ kid, key: randomBytes(32).toString("base64url") }] };
  await atomic(keyringPath, `${JSON.stringify(keyring)}\n`);
} else if (args.rotate) {
  if (!args.oldNotAfter || !Number.isFinite(Date.parse(args.oldNotAfter))) throw new Error("ALLOWLIST_ROTATION_DEADLINE_INVALID");
  if (Date.parse(args.oldNotAfter) <= Date.now()) throw new Error("ALLOWLIST_ROTATION_DEADLINE_INVALID");
  if (keyring.keys.some((entry) => entry.kid === kid)) throw new Error("ALLOWLIST_KID_DUPLICATE");
  if (keyring.keys.length >= 8) throw new Error("ALLOWLIST_KEYRING_LIMIT");
  keyring = { ...keyring, activeKid: kid, keys: keyring.keys.map((entry) => entry.kid === keyring.activeKid
    ? { ...entry, notAfter: args.oldNotAfter } : entry).concat({ kid, key: randomBytes(32).toString("base64url") }) };
  await atomic(keyringPath, `${JSON.stringify(keyring)}\n`);
} else if (kid !== keyring.activeKid) {
  throw new Error("ALLOWLIST_ROTATION_REQUIRED");
}

if (await readOptionalSecureFile(backupKeyPath) === null) {
  await atomic(backupKeyPath, `${randomBytes(32).toString("base64url")}\n`);
}
process.stdout.write(`keyring=${keyringPath} active_kid=${keyring.activeKid} backup_key_ready=true\n`);

async function readOptionalSecureFile(path) {
  let info;
  try { info = await stat(path); }
  catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new Error("ALLOWLIST_KEY_FILE_UNREADABLE");
  }
  if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error("ALLOWLIST_KEY_FILE_PERMISSIONS_INVALID");
  return readFile(path, "utf8");
}
async function atomic(path, content) {
  const temporary = `${path}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); }
    await chmod(temporary, 0o600); await rename(temporary, path);
    const directory = await open(dirname(path), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await rm(temporary, { force: true }).catch(() => undefined); }
}
function parse(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (name === "--rotate") { result.rotate = true; continue; }
    const value = values[index + 1]; if (!name?.startsWith("--") || !value || value.startsWith("--")) throw new Error("ALLOWLIST_ARGUMENTS_INVALID");
    const key = { "--keyring": "keyring", "--backup-key": "backupKey", "--kid": "kid", "--old-not-after": "oldNotAfter" }[name];
    if (!key) throw new Error("ALLOWLIST_ARGUMENTS_INVALID"); result[key] = value; index += 1;
  }
  return result;
}
function parseKeyring(source) {
  let value;
  try { value = JSON.parse(source); } catch { throw new Error("ALLOWLIST_KEYRING_INVALID"); }
  if (value?.formatVersion !== 1 || !/^[A-Za-z0-9._-]{1,64}$/u.test(value.activeKid ?? "")
    || !Array.isArray(value.keys) || value.keys.length < 1 || value.keys.length > 8) {
    throw new Error("ALLOWLIST_KEYRING_INVALID");
  }
  const kids = new Set();
  for (const entry of value.keys) {
    if (!/^[A-Za-z0-9._-]{1,64}$/u.test(entry?.kid ?? "") || kids.has(entry.kid)
      || !/^[A-Za-z0-9_-]{43}$/u.test(entry?.key ?? "") || Buffer.from(entry.key, "base64url").length !== 32
      || (entry.notAfter !== undefined && !Number.isFinite(Date.parse(entry.notAfter)))) {
      throw new Error("ALLOWLIST_KEYRING_INVALID");
    }
    kids.add(entry.kid);
  }
  const active = value.keys.find((entry) => entry.kid === value.activeKid);
  if (!active || active.notAfter !== undefined) throw new Error("ALLOWLIST_KEYRING_INVALID");
  return value;
}
