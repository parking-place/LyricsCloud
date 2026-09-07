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
    const owner = randomUUID(), other = randomUUID(), song = randomUUID(), lyric = randomUUID(), otherSong = randomUUID();
    users.push(owner, other);
    await pool!.query("begin");
    try {
      await pool!.query("insert into app_users(id,status) values($1,'active'),($2,'active')", [owner, other]);
      await pool!.query("insert into user_profiles(owner_id,display_name) values($1,'Export A'),($2,'Export B')", [owner, other]);
      await pool!.query("insert into resources(id,owner_id,type,title) values($1,$2,'song','같은 제목'),($3,$2,'lyrics','가사/초안'),($4,$5,'song','다른 계정')", [song, owner, lyric, otherSong, other]);
      await pool!.query("insert into songs(resource_id,owner_id,status,description,work_notes) values($1,$2,'idea','설명','메모'),($3,$4,'idea','','')", [song, owner, otherSong, other]);
      await pool!.query("insert into lyrics(resource_id,owner_id,song_id,body,memo,status) values($1,$2,$3,'snapshot-before','lyric memo','draft')", [lyric, owner, song]);
      await pool!.query("insert into user_settings(owner_id,theme) values($1,'dark')", [owner]);
      await pool!.query("commit");
    } catch (error) { await pool!.query("rollback"); throw error; }

    const snapshot = await store!.openSnapshot(owner);
    await pool!.query("update lyrics set body='snapshot-after' where resource_id=$1", [lyric]);
    const readable = [];
    for await (const row of snapshot.readableResources(1)) readable.push(row);
    expect(readable.map((row) => row.id)).toEqual([lyric, song]);
    expect(readable.find((row) => row.id === lyric)?.body).toBe("snapshot-before");
    const records = [];
    for await (const row of snapshot.records(1)) records.push(row);
    expect(JSON.stringify(records)).not.toContain(otherSong);
    expect(records.find((row) => row.section === "lyrics")?.data.body).toBe("snapshot-before");
    expect(await snapshot.settings()).toMatchObject({ profile: { display_name: "Export A" }, settings: { theme: "dark" } });
    await snapshot.close(true);
  });

  afterAll(async () => {
    if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
    await Promise.all([pool?.end(), store?.close()]);
  });
});
