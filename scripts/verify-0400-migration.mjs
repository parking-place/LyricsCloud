import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0400_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source);
url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0400_rhyme_notes.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate();
  migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const song = randomUUID(), lyric = randomUUID(), rhyme = randomUUID();
    await target.query("begin");
    await target.query(`insert into resources(id,owner_id,type,title) values
      ($1,$2,'song','합성 곡'),($3,$2,'lyrics','보존 가사'),($4,$2,'rhyme_note','합성 라임')`, [song, alice, lyric, rhyme]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, alice]);
    await target.query("insert into lyrics(resource_id,owner_id,song_id,body) values($1,$2,$3,'보존할 가사')", [lyric, alice, song]);
    await target.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'air / chair')", [rhyme, alice]);
    await target.query("commit");

    const firstTag = (await target.query(`insert into tags(owner_id,display_value,normalized_value)
      values($1,'  FIRE   Tag  ','ignored') returning id,display_value,normalized_value`, [alice])).rows[0];
    assert.deepEqual({ display: firstTag.display_value, normalized: firstTag.normalized_value }, { display: "FIRE Tag", normalized: "fire tag" });
    await assert.rejects(target.query("insert into tags(owner_id,display_value,normalized_value) values($1,'fire tag','ignored')", [alice]), /tags_owner_normalized_unique/);
    const bobTag = (await target.query("insert into tags(owner_id,display_value,normalized_value) values($1,'Bob','ignored') returning id", [bob])).rows[0].id;
    await assert.rejects(target.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [alice, rhyme, bobTag]), /RHYME_TAG_UNAVAILABLE/);
    await target.query("insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)", [alice, rhyme, firstTag.id]);
    await target.query("insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type) values($1,$2,$3,'rhyme_note')", [alice, song, rhyme]);

    const lyricKey = (await target.query(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,revision_body_sha256)
      values($1,$2,'lyrics',decode('0000','hex'),encode(sha256(convert_to('보존할 가사','UTF8')),'hex')) returning document_key`, [lyric, alice])).rows[0].document_key;
    const rhymeKey = (await target.query(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,revision_body_sha256)
      values($1,$2,'rhyme_note',decode('0000','hex'),encode(sha256(convert_to('air / chair','UTF8')),'hex')) returning document_key`, [rhyme, alice])).rows[0].document_key;
    await target.query(`insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason)
      values($1,$2,'보존할 가사',encode(sha256(convert_to('보존할 가사','UTF8')),'hex'),'leave'),
      ($3,$2,'air / chair',encode(sha256(convert_to('air / chair','UTF8')),'hex'),'leave')`, [lyricKey, alice, rhymeKey]);

    await assert.rejects(target.query(rollback), /0400_ROLLBACK_REQUIRES_EMPTY_RHYME_DATA/);
    assert.equal((await target.query("select count(*)::int count from rhyme_notes where resource_id=$1", [rhyme])).rows[0].count, 1);

    await target.query("delete from resources where id=$1", [rhyme]);
    await target.query("delete from tags where owner_id=any($1::uuid[])", [[alice, bob]]);
    await target.query(rollback);
    assert.equal((await target.query("select count(*)::int count from sync_documents where document_key=$1", [lyricKey])).rows[0].count, 1);
    assert.equal((await target.query("select body from lyric_revisions where document_key=$1", [lyricKey])).rows[0].body, "보존할 가사");
    await assert.rejects(target.query("select 1 from rhyme_notes"), /relation "rhyme_notes" does not exist/);

    migrate();
    migrate();
    assert.equal((await target.query("select resource_type from sync_documents where document_key=$1", [lyricKey])).rows[0].resource_type, "lyrics");
  } finally { await target.end(); }
  console.log("0400 migration, normalization, owner links, rollback guard and lyric preservation: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
