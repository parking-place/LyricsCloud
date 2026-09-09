import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0501_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0501_prompt_usage.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const prompt = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt','사용 기록 합성 프롬프트')", [prompt, owner]);
    await target.query("insert into prompts(resource_id,owner_id) values($1,$2)", [prompt, owner]);
    await target.query("commit");
    await target.query("begin");
    await target.query("set local role lyricscloud_app");
    await target.query("select set_config('app.user_id',$1,true)", [owner]);
    const usage = (await target.query("select * from mark_prompt_used($1)", [prompt])).rows[0];
    await target.query("commit");
    assert.equal(Number(usage.use_count), 1);
    assert.ok(usage.last_used_at);
    await assert.rejects(target.query(rollback), /0501_ROLLBACK_REQUIRES_EMPTY_PROMPT_USAGE/);
    await target.query("update prompts set use_count=0,last_used_at=null where resource_id=$1", [prompt]);
    await target.query(rollback);
    await assert.rejects(target.query("select use_count from prompts"), /column "use_count" does not exist/);
    migrate(); migrate();
  } finally { await target.end(); }
  console.log("0501 prompt usage migration, owner command and rollback guard: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
