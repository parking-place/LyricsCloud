import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1000_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1000_prompt_modes.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const columns = await target.query(`select table_name,column_name,column_default,is_nullable from information_schema.columns
      where table_schema='public' and ((table_name='prompts' and column_name in ('mode','sentence_text'))
        or (table_name='templates' and column_name in ('prompt_mode','prompt_text'))) order by table_name,column_name`);
    assert.equal(columns.rowCount, 4);
    assert.match(columns.rows.find((row) => row.column_name === "mode").column_default, /tags/);
    assert.match(columns.rows.find((row) => row.column_name === "prompt_mode").column_default, /tags/);

    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const prompt = randomUUID();
    const raw = "  cinematic, not tags.\r\n두  칸 🙂  ";
    await asUser(target, alice, async (client) => {
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt','raw')", [prompt, alice]);
      return client.query("insert into prompts(resource_id,owner_id,mode,plain_text,sentence_text) values($1,$2,'sentence','legacy tag',$3)", [prompt, alice, raw]);
    });
    assert.deepEqual((await asUser(target, alice, (client) => client.query(
      "select mode,plain_text,sentence_text,search_text from prompts where resource_id=$1", [prompt]))).rows[0],
    { mode: "sentence", plain_text: "legacy tag", sentence_text: raw, search_text: "legacy tag cinematic, not tags. 두 칸 🙂" });
    assert.equal((await asUser(target, bob, (client) => client.query("select 1 from prompts where resource_id=$1", [prompt]))).rowCount, 0);

    const template = randomUUID();
    await asUser(target, alice, (client) => client.query(`insert into templates
      (id,owner_id,type,title,prompt_tokens,prompt_mode,prompt_text) values($1,$2,'prompt','sentence','{}','sentence',$3)`, [template, alice, raw]));
    await assert.rejects(target.query(rollback), /PROMPT_MODE_ROLLBACK_BLOCKED|PROMPT_TEMPLATE_MODE_ROLLBACK_BLOCKED/);
    await target.query("delete from templates where id=$1", [template]);
    await target.query("delete from resources where id=$1", [prompt]);
    await target.query(rollback);
    assert.equal((await target.query(`select exists(select 1 from information_schema.columns
      where table_name='prompts' and column_name='sentence_text') present`)).rows[0].present, false);

    const legacyPrompt = randomUUID();
    await asUser(target, alice, async (client) => {
      await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt','legacy')", [legacyPrompt, alice]);
      return client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,'tag one, tag two')", [legacyPrompt, alice]);
    });
    migrate(); migrate();
    assert.deepEqual((await target.query("select mode,plain_text,sentence_text from prompts where resource_id=$1", [legacyPrompt])).rows[0],
      { mode: "tags", plain_text: "tag one, tag two", sentence_text: null });
  } finally { await target.end(); }
  console.log("1000 prompt modes fresh, raw round-trip, RLS, guarded rollback and legacy upgrade: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

async function asUser(pool, ownerId, work) {
  const client = await pool.connect();
  try {
    await client.query("begin"); await client.query("set local role lyricscloud_app");
    await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
    const result = await work(client); await client.query("commit"); return result;
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
