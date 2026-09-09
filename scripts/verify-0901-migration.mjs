import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0901_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source);
url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0901_beta_signup.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate();
  migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const columns = await target.query(`select column_name,is_nullable from information_schema.columns
      where table_schema='public' and table_name='beta_signup_intents'
        and column_name in ('code_id','code_epoch','claimed_code_digest') order by column_name`);
    assert.deepEqual(columns.rows, [
      { column_name: "claimed_code_digest", is_nullable: "NO" },
      { column_name: "code_epoch", is_nullable: "YES" },
      { column_name: "code_id", is_nullable: "YES" }
    ]);
    assert.equal((await target.query("select to_regclass('public.beta_signup_intents_claimed_code_idx')::text value")).rows[0].value,
      "beta_signup_intents_claimed_code_idx");
    await target.query(`insert into beta_signup_intents
      (intent_digest,environment,code_id,code_epoch,claimed_code_digest,email_digest,email_kid,oauth_state_hash,expires_at,created_at)
      values($1,'test',null,null,$2,$3,'test-kid',$4,now()+interval '10 minutes',now())`,
    ["1".repeat(64), "2".repeat(64), "3".repeat(64), "4".repeat(64)]);
    await assert.rejects(target.query(rollback), /0901 rollback blocked/);
    assert.equal((await target.query("select count(*)::int count from beta_signup_intents")).rows[0].count, 1);
    await target.query("delete from beta_signup_intents");
    await target.query(rollback);
    assert.equal((await target.query(`select exists(select 1 from information_schema.columns
      where table_name='beta_signup_intents' and column_name='claimed_code_digest') present`)).rows[0].present, false);
    assert.deepEqual((await target.query(`select column_name,is_nullable from information_schema.columns
      where table_name='beta_signup_intents' and column_name in ('code_id','code_epoch') order by column_name`)).rows,
    [{ column_name: "code_epoch", is_nullable: "NO" }, { column_name: "code_id", is_nullable: "NO" }]);
    migrate();
    migrate();
    assert.equal((await target.query("select exists(select 1 from schema_migrations where name='0901_beta_signup.sql') applied")).rows[0].applied, true);
  } finally {
    await target.end();
  }
  console.log("0901 pre-OAuth claims, rollback guard, and migration recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
