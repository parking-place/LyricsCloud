import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { dropMigrationTestDatabase } from "./migration-test-cleanup.mjs";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1151_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
let target;

try {
  await admin.query(`create database "${databaseName}"`);
  target = new Pool({ connectionString: url.href, max: 1 });
  await applyThrough1140(target);
  const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
  const subject = randomUUID();
  await target.query(`insert into auth_identities(issuer,subject,user_id,email,email_verified,display_name,avatar_url)
    values('https://accounts.google.com',$1,$2,'owner@example.test',true,'Provider old','https://example.test/provider.png')`,
  [subject, owner]);
  await target.query(`insert into user_profiles(owner_id,display_name,avatar_url)
    values($1,'Legacy kept','https://example.test/legacy.png')`, [owner]);
  migrate(); migrate();
  const profile = (await target.query(`select display_name,avatar_url,provider_display_name,
    provider_avatar_url,display_name_source,avatar_source,row_version::int
    from user_profiles where owner_id=$1`, [owner])).rows[0];
  assert.deepEqual(profile, { display_name: "Legacy kept", avatar_url: "https://example.test/legacy.png",
    provider_display_name: "Provider old", provider_avatar_url: "https://example.test/provider.png",
    display_name_source: "legacy_unclassified", avatar_source: "legacy_unclassified", row_version: 1 });
  assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1151_profile_customization.sql'"))
    .rows[0].count, 1);
  assert.equal((await target.query("select relrowsecurity,relforcerowsecurity from pg_class where relname='profile_avatar_photos'"))
    .rows[0].relrowsecurity, true);
  const rollback = await readFile("packages/database/rollback/1151_profile_customization.sql", "utf8");
  await target.query(rollback);
  assert.equal((await target.query("select display_name from user_profiles where owner_id=$1", [owner])).rows[0].display_name,
    "Legacy kept");
  migrate();
  console.log("1151 populated 1140 upgrade/repeat, legacy/provider separation, photo RLS, app-first rollback/recovery: OK");
} finally {
  if (target) await target.end();
  try { await dropMigrationTestDatabase(admin, databaseName); }
  finally { await admin.end(); }
}

async function applyThrough1140(pool) {
  await pool.query(`create table schema_migrations(name text primary key,sha256 text not null,
    applied_at timestamptz not null default now())`);
  const names = (await readdir("packages/database/migrations"))
    .filter((name) => name.endsWith(".sql") && name <= "1140_sharing_stability.sql").sort();
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
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href, APP_VERSION: "1.1.7b", APP_PHASE: "p2" },
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
