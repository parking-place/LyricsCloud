import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { issueBetaCodes, listUnusedBetaCodes, refreshUnusedBetaCodes, type BetaCodeKeys } from "../packages/database/src/beta-access.js";

async function main(): Promise<void> {
const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0900_admin_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const work = await mkdtemp(join(tmpdir(), "lyricscloud-beta-admin-"));
const indexFile = join(work, "index.key");
const aeadFile = join(work, "aead.key");
const keys: BetaCodeKeys = { indexKey: randomBytes(32), encryptionKey: randomBytes(32), indexKid: "test-kid" };
await writeFile(indexFile, `${keys.indexKey.toString("base64url")}\n`, { mode: 0o600 });
await writeFile(aeadFile, `${keys.encryptionKey.toString("base64url")}\n`, { mode: 0o600 });
await chmod(indexFile, 0o600); await chmod(aeadFile, 0o600);
const cliEnv = { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href, BETA_ENVIRONMENT: "test",
  BETA_CODE_INDEX_KID: keys.indexKid, BETA_CODE_INDEX_KEY_FILE: indexFile, BETA_CODE_AEAD_KEY_FILE: aeadFile };

try {
  await admin.query(`create database "${databaseName}"`);
  migrate();
  const target = new Pool({ connectionString: url.href, max: 8 });
  try {
    const issued = cli(["betacode", "-n", "7"]);
    assert.equal(issued.status, 0, issued.stderr);
    const firstCodes = issued.stdout.trim().split("\n");
    assert.equal(firstCodes.length, 7);
    assert.ok(firstCodes.every((code) => /^[A-Z0-9]{6}$/.test(code)));

    for (const invalid of ["0", "-1", "1.5", "seven", "101"]) {
      const rejected = cli(["betacode", "-n", invalid]);
      assert.notEqual(rejected.status, 0);
      assert.equal(rejected.stderr.trim(), "BETA_COUNT_INVALID");
    }
    assert.equal((await target.query("select count(*)::int count from beta_codes")).rows[0].count, 7);

    const durable = (await target.query("select id,code_digest,epoch::int epoch from beta_codes order by issued_at,id limit 1")).rows[0];
    const userId = randomUUID(); const grantId = randomUUID(); const intentDigest = "b".repeat(64);
    await target.query("insert into app_users(id) values($1)", [userId]);
    await target.query(`insert into admission_grants(id,environment,issuer,subject,user_id,source,state,granted_at,updated_at)
      values($1,'test','https://accounts.example.invalid','durable-principal',$2,'beta_code','active',now(),now())`, [grantId, userId]);
    await target.query(`insert into beta_signup_intents(intent_digest,environment,code_id,code_epoch,claimed_code_digest,email_digest,email_kid,oauth_state_hash,expires_at,completed_at)
      values($1,'test',$2,$3,$4,$5,'test-kid',$6,now()+interval '10 minutes',now())`,
      [intentDigest, durable.id, durable.epoch, durable.code_digest, "c".repeat(64), "d".repeat(64)]);
    await target.query("update beta_codes set consumed_at=now(),sealed_code=null,seal_nonce=null,seal_tag=null where id=$1", [durable.id]);
    await target.query(`insert into beta_redemptions(environment,intent_digest,code_id,grant_id,issuer,subject,redeemed_at)
      values('test',$1,$2,$3,'https://accounts.example.invalid','durable-principal',now())`, [intentDigest, durable.id, grantId]);

    const concurrent = await Promise.all(Array.from({ length: 4 }, () => issueBetaCodes(target, {
      environment: "test", count: 5, keys
    })));
    assert.equal(new Set(concurrent.flat().map(({ code }) => code)).size, 20);

    const beforeFailure = (await target.query("select count(*)::int count from beta_codes")).rows[0].count;
    const beforeActive = (await target.query("select count(*)::int count from beta_codes where consumed_at is null and revoked_at is null and expires_at>now()")).rows[0].count;
    const failedOutput = spawnSync("bash", ["-lc",
      "pnpm --filter @lyricscloud/database exec tsx src/beta-admin.ts betacode > /dev/full"],
      { cwd: process.cwd(), env: cliEnv, encoding: "utf8" });
    assert.notEqual(failedOutput.status, 0);
    assert.equal((await target.query("select count(*)::int count from beta_codes")).rows[0].count, beforeFailure + 1);
    const recovered = cli(["betacode", "ls"]);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(recovered.stdout.trim().split("\n").length, beforeActive + 1);

    const [refresh, racingIssue] = await Promise.all([
      refreshUnusedBetaCodes(target, "test"),
      issueBetaCodes(target, { environment: "test", count: 3, keys })
    ]);
    assert.equal(refresh.nextEpoch, refresh.previousEpoch + 1);
    assert.equal(racingIssue.length, 3);
    const activeEpochs = await target.query("select epoch::int epoch,count(*)::int count from beta_codes where consumed_at is null and revoked_at is null and expires_at>now() group by epoch");
    assert.ok(activeEpochs.rowCount === 0 || (activeEpochs.rowCount === 1
      && activeEpochs.rows[0].epoch === refresh.nextEpoch && activeEpochs.rows[0].count === 3));
    assert.equal((await target.query("select count(*)::int count from admission_grants where id=$1", [grantId])).rows[0].count, 1);
    assert.equal((await target.query("select count(*)::int count from beta_redemptions where grant_id=$1", [grantId])).rows[0].count, 1);

    const refreshCli = cli(["betacode", "refresh", "--confirm-environment", "test"]);
    assert.equal(refreshCli.status, 0, refreshCli.stderr);
    assert.match(refreshCli.stdout, /^environment=test revoked=(0|3) cancelled_intents=0 epoch=/);
    assert.equal((await target.query("select count(*)::int count from beta_codes where consumed_at is null and revoked_at is null")).rows[0].count, 0);

    await issueBetaCodes(target, { environment: "test", count: 100, keys });
    await assert.rejects(issueBetaCodes(target, { environment: "test", count: 1, keys }), /BETA_ACTIVE_LIMIT_EXCEEDED/);
    const wrongKeys = { ...keys, encryptionKey: randomBytes(32) };
    await assert.rejects(listUnusedBetaCodes(target, "test", wrongKeys), /BETA_CODE_DECRYPT_FAILED/);
    await refreshUnusedBetaCodes(target, "test");
  } finally { await target.end(); }
  console.log("0900 beta admin CLI issue/list/refresh, concurrency, bounds and output recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
  await rm(work, { recursive: true, force: true });
}

function cli(args: string[]) {
  return spawnSync("pnpm", ["--filter", "@lyricscloud/database", "exec", "tsx", "src/beta-admin.ts", ...args],
    { cwd: process.cwd(), env: cliEnv, encoding: "utf8" });
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "0900 beta admin verification failed"}\n`);
  process.exitCode = 1;
});
