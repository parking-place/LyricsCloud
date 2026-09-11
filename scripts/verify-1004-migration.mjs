import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_1004_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/1004_web_font_selection.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 2 });
  try {
    const owner = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID(); const lyric = randomUUID();
    await target.query("begin");
    await target.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','font parent'),($3,$2,'lyrics','font lyric')", [song, owner, lyric]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, owner]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id) values($1,$2,$3)", [lyric, owner, song]);
    await target.query("commit");
    await asUser(target, owner, (client) => client.query(
      "insert into user_settings(owner_id,writing_font) values($1,'noto_sans_kr')", [owner]));
    await asUser(target, owner, (client) => client.query(
      "insert into lyric_display_settings(lyric_id,owner_id,writing_font,font_size,line_height,letter_spacing) values($1,$2,'noto_sans_kr',18,1.8,0)", [lyric, owner]));
    assert.equal((await asUser(target, owner, (client) => client.query("select writing_font from user_settings where owner_id=$1", [owner]))).rows[0].writing_font, "noto_sans_kr");
    await assert.rejects(target.query("update user_settings set writing_font='unknown' where owner_id=$1", [owner]), /check constraint/);

    await target.query(rollback);
    assert.deepEqual((await target.query("select writing_font from user_settings where owner_id=$1", [owner])).rows[0], { writing_font: "sans" });
    assert.deepEqual((await target.query("select writing_font from lyric_display_settings where lyric_id=$1", [lyric])).rows[0], { writing_font: "sans" });
    await assert.rejects(target.query("update user_settings set writing_font='noto_sans_kr' where owner_id=$1", [owner]), /check constraint/);

    migrate(); migrate();
    await target.query("update user_settings set writing_font='noto_sans_kr' where owner_id=$1", [owner]);
    assert.equal((await target.query("select count(*)::int count from schema_migrations where name='1004_web_font_selection.sql'")).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("1004 font selection fresh/repeat, constraints, downgrade conversion and recovery: OK");
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
  const result = spawnSync("corepack", ["pnpm", "migrate"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
