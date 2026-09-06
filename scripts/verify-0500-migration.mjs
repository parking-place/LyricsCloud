import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";

const source = new URL(process.env.DATABASE_URL ?? "");
if (!source.pathname.slice(1).endsWith("_test")) throw new Error("requires disposable *_test database");
const databaseName = `lyricscloud_0500_${randomUUID().replaceAll("-", "")}`;
const url = new URL(source); url.pathname = `/${databaseName}`;
const admin = new Pool({ connectionString: source.href, max: 1 });
const rollback = await readFile("packages/database/rollback/0500_prompts.sql", "utf8");

try {
  await admin.query(`create database "${databaseName}"`);
  migrate(); migrate();
  const target = new Pool({ connectionString: url.href, max: 1 });
  try {
    const alice = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const bob = (await target.query("insert into app_users default values returning id")).rows[0].id;
    const prompt = randomUUID(), song = randomUUID(), rhyme = randomUUID();
    await target.query("begin");
    await target.query(`insert into resources(id,owner_id,type,title) values
      ($1,$2,'prompt','합성 프롬프트'),($3,$2,'song','보존 곡'),($4,$2,'rhyme_note','보존 라임')`, [prompt, alice, song, rhyme]);
    await target.query("insert into prompts(resource_id,owner_id,plain_text) values($1,$2,'Ｆｅｍａｌｅ  Vocal')", [prompt, alice]);
    await target.query("insert into songs(resource_id,owner_id) values($1,$2)", [song, alice]);
    await target.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,'보존')", [rhyme, alice]);
    await target.query("commit");

    const aliceToken = (await target.query(`insert into prompt_token_dictionary(owner_id,display_value,normalized_value,usage_count,last_used_at)
      values($1,'Ｆｅｍａｌｅ  Vocal','ignored',1,clock_timestamp()) returning id,display_value,normalized_value`, [alice])).rows[0];
    assert.deepEqual({ display: aliceToken.display_value, normalized: aliceToken.normalized_value },
      { display: "Ｆｅｍａｌｅ  Vocal", normalized: "female vocal" });
    const bobToken = (await target.query(`insert into prompt_token_dictionary(owner_id,display_value,normalized_value)
      values($1,'Bob token','ignored') returning id`, [bob])).rows[0].id;
    await target.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,0,$3,'Ｆｅｍａｌｅ  Vocal','ignored')`, [alice, prompt, aliceToken.id]);
    await assert.rejects(target.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,1,$3,'female vocal','ignored')`, [alice, prompt, aliceToken.id]), /prompt_tokens_owner_normalized_unique/);
    await assert.rejects(target.query(`insert into prompt_tokens(owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value)
      values($1,$2,1,$3,'Bob token','ignored')`, [alice, prompt, bobToken]), /PROMPT_TOKEN_DICTIONARY_MISMATCH/);
    await target.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
      values($1,$2,$3,'prompt')`, [alice, song, prompt]);
    await target.query(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,revision_body_sha256)
      values($1,$2,'prompt',decode('0000','hex'),encode(sha256(convert_to('','UTF8')),'hex'))`, [prompt, alice]);

    await assert.rejects(target.query(rollback), /0500_ROLLBACK_REQUIRES_EMPTY_PROMPT_DATA/);
    assert.equal((await target.query("select count(*)::int count from prompts where resource_id=$1", [prompt])).rows[0].count, 1);

    await target.query("delete from resources where id=$1", [prompt]);
    await target.query("delete from prompt_token_dictionary where owner_id=any($1::uuid[])", [[alice, bob]]);
    await target.query(rollback);
    assert.equal((await target.query("select count(*)::int count from rhyme_notes where resource_id=$1", [rhyme])).rows[0].count, 1);
    await assert.rejects(target.query("select 1 from prompts"), /relation "prompts" does not exist/);
    migrate(); migrate();
    assert.equal((await target.query("select count(*)::int count from rhyme_notes where resource_id=$1", [rhyme])).rows[0].count, 1);
  } finally { await target.end(); }
  console.log("0500 migration, token normalization, owner isolation, rollback guard and rhyme preservation: OK");
} finally {
  await admin.query(`drop database if exists "${databaseName}" with (force)`).catch(() => undefined);
  await admin.end();
}

function migrate() {
  const result = spawnSync("pnpm", ["migrate"], { env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url.href }, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "migration failed");
}
