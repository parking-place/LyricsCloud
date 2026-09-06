import { createHash, randomUUID } from "node:crypto";
import { PostgresLyricStore, PostgresSongStore } from "@lyricscloud/database";
import { parseCreateLyricInput, parseCreateSongInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { CollaborationStore, materialize } from "./store.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const url = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: url }) : null;
const store = enabled ? new CollaborationStore(url) : null;
const songs = enabled ? new PostgresSongStore(url, 2) : null;
const lyrics = enabled ? new PostgresLyricStore(url, 2) : null;
const users: string[] = [];
const hash = (body: string) => createHash("sha256").update(body).digest("hex");

describe.runIf(enabled)("immutable body revisions", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(url)) throw new Error("requires isolated lyricscloud_test");
    for (let i = 0; i < 2; i++) users.push((await pool.query("insert into app_users default values returning id")).rows[0].id);
  });

  it("snapshots changed bodies once per five-minute window and deduplicates important checkpoints", async () => {
    const f = await fixture();
    const start = new Date();
    expect((await store!.listRevisions(f.owner, f.key))!.items).toEqual([]);
    await edit(f, "첫 번째 수정");
    expect(await store!.checkpoint(f.owner, f.key, "interval", start)).toBeNull();
    const first = await store!.checkpoint(f.owner, f.key, "interval", new Date(start.getTime() + 300_001));
    expect(first).toMatchObject({ reason: "interval" });
    await edit(f, "두 번째 수정");
    expect(await store!.checkpoint(f.owner, f.key, "interval", new Date(start.getTime() + 599_999))).toBeNull();
    expect(await store!.checkpoint(f.owner, f.key, "interval", new Date(start.getTime() + 600_002))).not.toBeNull();
    expect((await store!.listRevisions(f.owner, f.key))!.items).toHaveLength(2);
    const at = new Date(start.getTime() + 600_003);
    await store!.checkpoint(f.owner, f.key, "leave", at);
    await store!.checkpoint(f.owner, f.key, "duplicate", at);
    expect((await store!.listRevisions(f.owner, f.key))!.items).toHaveLength(2);
    await store!.checkpoint(f.owner, f.key, "interval", new Date(at.getTime() + 300_001));
    expect((await store!.listRevisions(f.owner, f.key))!.items).toHaveLength(2);
  });

  it("restores atomically, retains the pre-restore body, rejects stale comparisons and survives response loss", async () => {
    const f = await fixture();
    const old = await store!.checkpoint(f.owner, f.key, "large_paste");
    await edit(f, "현재 본문\n[Hook]\n복원 직전 🎵");
    const before = (await store!.listRevisions(f.owner, f.key))!.current;
    const request = { requestId: randomUUID(), expectedHash: before.hash };
    const cached = (await store!.loadDocument(f.owner, f.key))!;
    const offline = materialize(cached.snapshot, cached.updates);
    const vector = Y.encodeStateVector(offline);
    offline.getText("body").insert(offline.getText("body").length, "\n오프라인에서 새로 쓴 줄");
    const first = await store!.restoreRevision(f.owner, f.key, old!.id, request);
    expect(first).toMatchObject({ duplicate: false });
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).toBe("[Verse]\n원래 표현");
    const history = (await store!.listRevisions(f.owner, f.key))!.items;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ reason: "before_restore" });
    expect((await store!.getRevision(f.owner, f.key, history[0]!.id))!.body).toBe(before.body);
    await store!.applyUpdate(f.owner, f.key, randomUUID(), Y.encodeStateAsUpdate(offline, vector));
    offline.destroy();
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).toContain("오프라인에서 새로 쓴 줄");
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).not.toContain("복원 직전 🎵");

    // Replaying an uncertain HTTP result must not restore over subsequent edits.
    await edit(f, "복원 뒤 새 표현");
    expect(await store!.restoreRevision(f.owner, f.key, old!.id, request)).toMatchObject({ duplicate: true });
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).toBe("복원 뒤 새 표현");
    await expect(store!.restoreRevision(f.owner, f.key, old!.id, { ...request, requestId: randomUUID() })).rejects.toThrow("REVISION_CURRENT_CHANGED");
    expect((await store!.listRevisions(f.owner, f.key))!.items).toHaveLength(2);
    await store!.restoreRevision(f.owner, f.key, history[0]!.id, { requestId: randomUUID(), expectedHash: hash("복원 뒤 새 표현") });
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).toBe(before.body);
    expect(await lyrics!.listSongLyrics(f.owner, f.songId)).toHaveLength(1);
  });

  it("rolls back the whole restore when projection fails, without losing current or target history", async () => {
    const f = await fixture();
    const old = await store!.checkpoint(f.owner, f.key, "duplicate");
    await edit(f, "보존할 현재본");
    const trigger = `revision_failure_${randomUUID().replaceAll("-", "")}`;
    await pool!.query(`create function ${trigger}() returns trigger language plpgsql as $$ begin
      if new.resource_id='${f.id}' then raise exception 'synthetic projection failure'; end if; return new; end $$;
      create trigger ${trigger} before update on lyrics for each row execute function ${trigger}()`);
    const request = { requestId: randomUUID(), expectedHash: hash("보존할 현재본") };
    try {
      await expect(store!.restoreRevision(f.owner, f.key, old!.id, request)).rejects.toThrow("synthetic projection failure");
      expect((await store!.listRevisions(f.owner, f.key))!.current.body).toBe("보존할 현재본");
      expect((await store!.listRevisions(f.owner, f.key))!.items).toHaveLength(1);
    } finally { await pool!.query(`drop trigger ${trigger} on lyrics; drop function ${trigger}()`); }
    expect(await store!.restoreRevision(f.owner, f.key, old!.id, request)).toMatchObject({ duplicate: false });
  });

  it("enforces owner isolation, immutable rows and deleted-document guards", async () => {
    const f = await fixture();
    const old = await store!.checkpoint(f.owner, f.key, "leave");
    const other = users[1]!;
    expect(await store!.listRevisions(other, f.key)).toBeNull();
    expect(await store!.getRevision(other, f.key, old!.id)).toBeNull();
    expect(await store!.restoreRevision(other, f.key, old!.id, { requestId: randomUUID(), expectedHash: hash("[Verse]\n원래 표현") })).toBeNull();
    const client = await pool!.connect();
    try {
      await client.query("begin"); await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [other]);
      expect((await client.query("select id from lyric_revisions where document_key=$1", [f.key])).rows).toEqual([]);
      await client.query("select set_config('app.user_id',$1,true)", [f.owner]);
      await expect(client.query("update lyric_revisions set body='overwrite' where id=$1", [old!.id])).rejects.toThrow(/permission denied/);
      await client.query("rollback");
    } finally { client.release(); }
    await lyrics!.deleteLyric(f.owner, f.id);
    expect(await store!.listRevisions(f.owner, f.key)).toBeNull();
    expect(await store!.checkpoint(f.owner, f.key, "leave")).toBeNull();
    expect(await store!.restoreRevision(f.owner, f.key, old!.id, { requestId: randomUUID(), expectedHash: hash("[Verse]\n원래 표현") })).toBeNull();
  });

  it("prunes 181-day and 201st revisions without deleting named lyrics or the fresh pre-restore record", async () => {
    const f = await fixture();
    const original = await store!.checkpoint(f.owner, f.key, "leave");
    await pool!.query("update lyric_revisions set created_at=now()-interval '181 days' where id=$1", [original!.id]);
    await pool!.query(`insert into lyric_revisions(document_key,owner_id,body,body_sha256,reason,created_at)
      select $1,$2,'合成-'||i,encode(sha256(convert_to('合成-'||i,'UTF8')),'hex'),'interval',now()-i*interval '1 minute' from generate_series(1,201) i`, [f.key, f.owner]);
    await store!.maintainRevisions();
    const history = (await store!.listRevisions(f.owner, f.key))!.items;
    expect(history).toHaveLength(200);
    expect(await store!.getRevision(f.owner, f.key, original!.id)).toBeNull();
    await store!.restoreRevision(f.owner, f.key, history[199]!.id, { requestId: randomUUID(), expectedHash: hash("[Verse]\n원래 표현") });
    const after = (await store!.listRevisions(f.owner, f.key))!.items;
    expect(after).toHaveLength(200);
    expect(after[0]).toMatchObject({ reason: "before_restore" });
    expect((await store!.getRevision(f.owner, f.key, after[0]!.id))!.body).toBe("[Verse]\n원래 표현");
    expect((await lyrics!.getLyric(f.owner, f.id))!.body).toBe("合成-200");
    expect((await store!.getRevision(f.owner, f.key, history[199]!.id))!.body).toBe("合成-200");
  });
});

async function fixture() {
  const owner = users[0]!;
  const song = (await songs!.createSong(owner, parseCreateSongInput({ title: "수정 기록 합성 곡", requestId: randomUUID() }))).song;
  const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ title: "이름 있는 가사", body: "[Verse]\n원래 표현", requestId: randomUUID() }, song.id)))!.lyric;
  const doc = (await store!.ensureDocument(owner, lyric.id))!;
  return { owner, key: doc.document_key, id: lyric.id, songId: song.id };
}
async function edit(f: { owner: string; key: string }, body: string) {
  const loaded = (await store!.loadDocument(f.owner, f.key))!;
  const doc = materialize(loaded.snapshot, loaded.updates);
  const vector = Y.encodeStateVector(doc);
  doc.transact(() => { doc.getText("body").delete(0, doc.getText("body").length); doc.getText("body").insert(0, body); });
  await store!.applyUpdate(f.owner, f.key, randomUUID(), Y.encodeStateAsUpdate(doc, vector)); doc.destroy();
}
afterAll(async () => {
  if (users.length) await pool!.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([store?.close(), lyrics?.close(), songs?.close(), pool?.end()]);
});
