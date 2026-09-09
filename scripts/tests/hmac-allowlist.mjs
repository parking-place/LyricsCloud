import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { digestEmail, migrateAllowlist, restoreAllowlist } from "../migrate-test-users-hmac.mjs";

test("HMAC allowlist migration dry-runs, seals a rollback copy, swaps atomically, and restores explicitly", async () => {
  const work = await mkdtemp(join(tmpdir(), "lyricscloud-hmac-allowlist-"));
  try {
    const source = join(work, ".test_users"); const keyring = join(work, "keyring");
    const backupKey = join(work, "backup.key"); const backup = join(work, "backup.enc"); const restored = join(work, "restored");
    const raw = "# synthetic only\n User@Example.com\nuser@example.com\nsecond@example.test\n";
    const hmacKey = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
    await writeFile(source, raw, { mode: 0o600 });
    await writeFile(keyring, JSON.stringify({ formatVersion: 1, activeKid: "test-kid",
      keys: [{ kid: "test-kid", key: hmacKey.toString("base64url") }] }), { mode: 0o600 });
    await writeFile(backupKey, `${randomBytes(32).toString("base64url")}\n`, { mode: 0o600 });
    await chmod(source, 0o600); await chmod(keyring, 0o600); await chmod(backupKey, 0o600);

    const dry = await migrateAllowlist({ source, keyring, environment: "development", dryRun: true });
    assert.deepEqual(dry, { inputCount: 3, uniqueCount: 2, alreadyHashed: false, changed: false });
    assert.equal(await readFile(source, "utf8"), raw);
    const applied = await migrateAllowlist({ source, keyring, environment: "development", apply: true, backupKey, backupOutput: backup });
    assert.equal(applied.changed, true);
    const hashed = await readFile(source, "utf8");
    assert.ok(!hashed.includes("user@example.com") && !hashed.includes("second@example.test"));
    assert.ok(hashed.includes("130c6d19a930ce952d2c36f2bc2526585f8d3eb33ad55893c20a74cd82d107cc"));
    assert.ok(!(await readFile(backup, "utf8")).includes("user@example.com"));
    assert.deepEqual(await migrateAllowlist({ source, keyring, environment: "development", dryRun: true }),
      { inputCount: 2, uniqueCount: 2, alreadyHashed: true, changed: false });

    await assert.rejects(restoreAllowlist({ backupInput: backup, backupKey, target: restored,
      environment: "development", confirm: "wrong" }), /ALLOWLIST_RESTORE_CONFIRM_REQUIRED/);
    await restoreAllowlist({ backupInput: backup, backupKey, target: restored,
      environment: "development", confirm: "restore-plaintext" });
    assert.equal(await readFile(restored, "utf8"), raw);
  } finally { await rm(work, { recursive: true, force: true }); }
});

test("normalization preserves plus and dot semantics while binding environment", () => {
  const key = Buffer.from(Array.from({ length: 32 }, (_, index) => index));
  assert.equal(digestEmail(" User@Example.com ", "development", key),
    "130c6d19a930ce952d2c36f2bc2526585f8d3eb33ad55893c20a74cd82d107cc");
  assert.notEqual(digestEmail("user+tag@example.com", "development", key), digestEmail("user@example.com", "development", key));
  assert.notEqual(digestEmail("u.ser@example.com", "development", key), digestEmail("user@example.com", "development", key));
  assert.notEqual(digestEmail("user@example.com", "development", key), digestEmail("user@example.com", "release", key));
});

test("already-hashed input still requires every referenced key and rejects duplicates", async () => {
  const work = await mkdtemp(join(tmpdir(), "lyricscloud-hmac-validation-"));
  try {
    const source = join(work, "allowlist"); const keyring = join(work, "keyring");
    const key = Buffer.alloc(32, 4).toString("base64url");
    const record = { formatVersion: 1, environment: "development", purpose: "auth-bootstrap",
      normalizationVersion: "nfkc-trim-lower-v1", kid: "missing", digest: "a".repeat(64), state: "active" };
    await writeFile(source, `${JSON.stringify(record)}\n`, { mode: 0o600 });
    await writeFile(keyring, JSON.stringify({ formatVersion: 1, activeKid: "current",
      keys: [{ kid: "current", key }] }), { mode: 0o600 });
    await assert.rejects(migrateAllowlist({ source, keyring, environment: "development", dryRun: true }),
      /ALLOWLIST_RECORD_KEY_MISSING/);
    await writeFile(source, `${JSON.stringify({ ...record, kid: "current" })}\n${JSON.stringify({ ...record, kid: "current" })}\n`,
      { mode: 0o600 });
    await assert.rejects(migrateAllowlist({ source, keyring, environment: "development", dryRun: true }),
      /ALLOWLIST_HASH_RECORD_DUPLICATE/);
  } finally { await rm(work, { recursive: true, force: true }); }
});

test("key provisioning keeps an unexpired active key and creates a bounded rotation window", async () => {
  const work = await mkdtemp(join(tmpdir(), "lyricscloud-hmac-provision-"));
  try {
    const keyring = join(work, "keyring"); const backupKey = join(work, "backup.key");
    const script = new URL("../provision-auth-allowlist-keys.mjs", import.meta.url);
    const initial = spawnSync(process.execPath, [script.pathname, "--keyring", keyring, "--backup-key", backupKey, "--kid", "old"],
      { encoding: "utf8" });
    assert.equal(initial.status, 0, initial.stderr);
    const deadline = new Date(Date.now() + 86_400_000).toISOString();
    const rotated = spawnSync(process.execPath, [script.pathname, "--keyring", keyring, "--backup-key", backupKey,
      "--kid", "new", "--rotate", "--old-not-after", deadline], { encoding: "utf8" });
    assert.equal(rotated.status, 0, rotated.stderr);
    const value = JSON.parse(await readFile(keyring, "utf8"));
    assert.equal(value.activeKid, "new");
    assert.equal(value.keys.length, 2);
    assert.equal(value.keys.find((entry) => entry.kid === "old").notAfter, deadline);
    assert.equal(value.keys.find((entry) => entry.kid === "new").notAfter, undefined);
    const rejected = spawnSync(process.execPath, [script.pathname, "--keyring", keyring, "--backup-key", backupKey,
      "--kid", "later", "--rotate", "--old-not-after", "2000-01-01T00:00:00.000Z"], { encoding: "utf8" });
    assert.notEqual(rejected.status, 0);
  } finally { await rm(work, { recursive: true, force: true }); }
});
