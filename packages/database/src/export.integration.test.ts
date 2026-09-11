import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresExportStore } from "./export.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const store = enabled ? new PostgresExportStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("owner export repeatable snapshot", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
  });

  it("streams only one owner and keeps every pass at the opened snapshot", async () => {
    const owner = randomUUID(), other = randomUUID(), song = randomUUID(), lyric = randomUUID(), prompt = randomUUID(), template = randomUUID(), otherSong = randomUUID();
    users.push(owner, other);
    await pool!.query("begin");
    try {
      await pool!.query("insert into app_users(id,status) values($1,'active'),($2,'active')", [owner, other]);
      await pool!.query("insert into user_profiles(owner_id,display_name) values($1,'Export A'),($2,'Export B')", [owner, other]);
      await pool!.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','같은 제목'),($3,$2,'lyrics','가사/초안'),($4,$2,'prompt','문장 프롬프트'),($5,$6,'song','다른 계정')", [song, owner, lyric, prompt, otherSong, other]);
      await pool!.query("insert into songs(resource_id,owner_id,status,description,work_notes) values($1,$2,'idea','설명','메모'),($3,$4,'idea','','')", [song, owner, otherSong, other]);
      await pool!.query("insert into song_suno_workspaces(song_resource_id,owner_id,model_label,row_version) values($1,$2,'custom-v6',1)", [song, owner]);
      await pool!.query(`insert into song_suno_links(owner_id,song_resource_id,url,title,note,position)
        values($1,$2,'https://suno.com/s/export11','내보내기 링크','수동 메모',0)`, [owner, song]);
      await pool!.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$2,$3,'snapshot-before','lyric memo','draft')", [lyric, owner, song]);
      await pool!.query("insert into prompts(resource_id,owner_id,mode,plain_text,sentence_text) values($1,$2,'sentence','dormant tag',$3)", [prompt, owner, "  raw, sentence.\r\n두  칸  "]);
      await pool!.query("insert into templates(id,owner_id,type,title,prompt_tokens,prompt_mode,prompt_text) values($1,$2,'prompt','문장 템플릿','{}','sentence',$3)", [template, owner, " template, raw "]);
      await pool!.query("insert into user_settings(owner_id,theme) values($1,'dark')", [owner]);
      await pool!.query("commit");
    } catch (error) { await pool!.query("rollback"); throw error; }

    const snapshot = await store!.openSnapshot(owner);
    await pool!.query("update lyrics set body='snapshot-after' where resource_id=$1", [lyric]);
    const readable = [];
    for await (const row of snapshot.readableResources(1)) readable.push(row);
    expect(readable.map((row) => row.id)).toEqual([lyric, prompt, song]);
    expect(readable.find((row) => row.id === lyric)?.body).toBe("snapshot-before");
    expect(readable.find((row) => row.id === prompt)).toMatchObject({ promptMode: "sentence", plainText: "  raw, sentence.\r\n두  칸  " });
    expect(readable.find((row) => row.id === song)).toMatchObject({
      sunoModelLabel: "custom-v6",
      sunoLinks: [expect.objectContaining({ url: "https://suno.com/s/export11", title: "내보내기 링크", note: "수동 메모" })]
    });
    const readableTemplates = [];
    for await (const row of snapshot.readableTemplates(1)) readableTemplates.push(row);
    expect(readableTemplates).toContainEqual(expect.objectContaining({ id: template, promptMode: "sentence", promptText: " template, raw " }));
    const records = [];
    for await (const row of snapshot.records(1)) records.push(row);
    expect(JSON.stringify(records)).not.toContain(otherSong);
    expect(records.find((row) => row.section === "lyrics")?.data.body).toBe("snapshot-before");
    expect(records.find((row) => row.section === "songSunoWorkspaces")?.data.model_label).toBe("custom-v6");
    expect(records.find((row) => row.section === "songSunoLinks")?.data.url).toBe("https://suno.com/s/export11");
    expect(await snapshot.settings()).toMatchObject({ profile: { display_name: "Export A" }, settings: { theme: "dark" } });
    await snapshot.close(true);
  });

  afterAll(async () => {
    if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
    await Promise.all([pool?.end(), store?.close()]);
  });
});
