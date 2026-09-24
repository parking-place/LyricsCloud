import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { dropMigrationTestDatabase } from "./migration-test-cleanup.mjs";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1152_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
let target;

try {
  await admin.query(`create database "${databaseName}"`);
  target = new Pool({ connectionString: url.href, max: 1 });
  await applyThrough1151(target);
  const oldForeignKey = await foreignKeyDefinition(target);
  assert.equal(oldForeignKey.confdeltype, "r");
  const owner = await createPromptWithDictionary(target);

  migrate(); migrate();
  assert.deepEqual(await foreignKeyDefinition(target), { confdeltype: "a", condeferrable: true, condeferred: true });
  assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1152_prompt_dictionary_cascade.sql'"))
    .rows[0].count, 1);
  assert.equal((await target.query("select count(*)::int count from prompt_tokens where owner_id=$1", [owner])).rows[0].count, 1);
  await assert.rejects(target.query("delete from prompt_token_dictionary where owner_id=$1", [owner]),
    (error) => error.code === "23503");
  await target.query("delete from app_users where id=$1", [owner]);
  const counts = (await target.query(`select
    (select count(*)::int from app_users where id=$1) users,
    (select count(*)::int from prompt_token_dictionary where owner_id=$1) dictionary,
    (select count(*)::int from prompt_tokens where owner_id=$1) tokens`, [owner])).rows[0];
  assert.deepEqual(counts, { users: 0, dictionary: 0, tokens: 0 });
  console.log("1152 existing 1151 upgrade/repeat, dictionary protection, prompt owner cascade: OK");
} finally {
  if (target) await target.end();
  try { await dropMigrationTestDatabase(admin, databaseName); }
  finally { await admin.end(); }
}

async function foreignKeyDefinition(pool) {
  const result = await pool.query(`select confdeltype,condeferrable,condeferred from pg_constraint
    where conname='prompt_tokens_dictionary_fk' and conrelid='prompt_tokens'::regclass`);
  assert.equal(result.rowCount, 1);
  return result.rows[0];
}

async function createPromptWithDictionary(pool) {
  const owner = randomUUID(), prompt = randomUUID(), dictionary = randomUUID();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("insert into app_users(id,status) values($1,'active')", [owner]);
    await client.query("insert into resources(id,owner_id,type,title) values($1,$2,'prompt','Synthetic cascade')", [prompt, owner]);
    await client.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,'synthetic')", [prompt, owner]);
    await client.query(`insert into prompt_token_dictionary(id,owner_id,display_value,normalized_value)
      values($1,$2,'Synthetic','synthetic')`, [dictionary, owner]);
    await client.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,0,$3,'Synthetic','synthetic')`, [owner, prompt, dictionary]);
    await client.query("commit");
  } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
  finally { client.release(); }
  return owner;
}

async function applyThrough1151(pool) {
  await pool.query(`create table schema_migrations(name text primary key,sha256 text not null,
    applied_at timestamptz not null default now())`);
  const names = (await readdir("packages/database/migrations"))
    .filter((name) => name.endsWith(".sql") && name <= "1151_profile_customization.sql").sort();
  for (const name of names) {
    const body = await readFile(`packages/database/migrations/${name}`, "utf8");
    const hash = createHash("sha256").update(body).digest("hex");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(body);
      await client.query("insert into schema_migrations(name,sha256) values($1,$2)", [name, hash]);
      await client.query("commit");
    } catch (error) { await client.query("rollback").catch(() => undefined); throw error; }
    finally { client.release(); }
  }
}

function migrate() {
  const result = spawnSync("corepack", ["pnpm", "migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href, APP_VERSION: "1.1.7b", APP_CHANNEL: "dev", APP_PHASE: "p4" },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
