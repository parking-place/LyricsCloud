import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0702_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0702_recent_items.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID();
    const lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','Recent parent')", [song, alice]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, alice]);
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'lyrics','Recent lyric')", [lyric, alice]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'[Hook]\nline')", [lyric, alice, song]);
    await target.query("commit");
    await target.query(`insert into recent_items(owner_id,resource_id,resource_type,cursor_offset,songform_label,
      songform_occurrence,scroll_top,viewport,position_saved_at,position_basis_updated_at)
      select $1,$2,'lyrics',7,'Hook',1,120,'mobile',clock_timestamp(),updated_at from resources where id=$2`, [alice, lyric]);
    assert.deepEqual((await target.query("select cursor_offset,songform_label,viewport from recent_items where owner_id=$1", [alice])).rows[0], {
      cursor_offset: 7, songform_label: "Hook", viewport: "mobile"
    });
    await assert.rejects(target.query(`insert into recent_items(owner_id,resource_id,resource_type,cursor_offset,
      scroll_top,viewport,position_saved_at,position_basis_updated_at)
      values($1,$2,'song',1,0,'desktop',now(),now())`, [alice, song]), /recent_items_location_shape/);

    const client = await target.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [bob]);
      assert.equal((await client.query("select * from recent_items")).rowCount, 0);
      await assert.rejects(client.query(
        "insert into recent_items(owner_id,resource_id,resource_type) values($1,$2,'lyrics')", [alice, lyric]
      ), /row-level security/);
      await client.query("rollback");
    } finally { client.release(); }

    await target.query(rollback);
    assert.equal((await target.query("select to_regclass('public.recent_items')::text value")).rows[0].value, null);
    migrate(); migrate();
    assert.equal((await target.query("select to_regclass('public.recent_items')::text value")).rows[0].value, "recent_items");
  } finally { await target.end(); }
  console.log("0702 recent item integrity, content-free position, forced RLS, rollback and recovery: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
