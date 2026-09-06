import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreateRhymeNoteInput, parseCreateSongInput } from "@lyricscloud/domain";
import { PostgresLyricStore, PostgresRhymeStore, PostgresSongStore } from "@lyricscloud/database";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { CollaborationStore, materialize } from "./store.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const sync = enabled ? new CollaborationStore(databaseUrl) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl, 2) : null;
const rhymes = enabled ? new PostgresRhymeStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("durable owner-only collaboration state", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("collaboration integration requires lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("deduplicates updates, projects UTF-8 text, compacts and recovers after restart", async () => {
    const [alice, bob] = users as [string, string];
    const song = (await songs!.createSong(alice, parseCreateSongInput({ title: "동기화 곡", requestId: randomUUID() }))).song;
    const lyric = (await lyrics!.createLyric(alice, parseCreateLyricInput({ title: "관계형 제목", body: "[Verse]\n시작 🎵", requestId: randomUUID() }, song.id)))!.lyric;
    const mapping = await sync!.ensureDocument(alice, lyric.id);
    expect(mapping).not.toBeNull();
    expect(await sync!.ensureDocument(bob, lyric.id)).toBeNull();
    expect(await sync!.loadDocument(bob, mapping!.document_key)).toBeNull();
    await expect(lyrics!.updateLyricCurrent(alice, lyric.id, { rowVersion: lyric.rowVersion, body: "stale REST body" })).rejects.toThrow("VERSION_CONFLICT");
    expect(await lyrics!.updateLyricCurrent(alice, lyric.id, { rowVersion: lyric.rowVersion, title: "관계형 제목 수정" })).toMatchObject({ title: "관계형 제목 수정" });

    const loaded = await sync!.loadDocument(alice, mapping!.document_key);
    const client = materialize(loaded!.snapshot, loaded!.updates);
    let update: Uint8Array<ArrayBufferLike> = new Uint8Array();
    client.once("update", (value) => { update = value; });
    client.getText("body").insert(client.getText("body").length, "\n긴 한글\n[Hook]\n끝 😊");
    const updateId = randomUUID();
    expect(await sync!.applyUpdate(alice, mapping!.document_key, updateId, update)).toMatchObject({ duplicate: false });
    expect(await sync!.applyUpdate(alice, mapping!.document_key, updateId, update)).toMatchObject({ duplicate: true });
    await expect(sync!.applyUpdate(alice, mapping!.document_key, updateId, Uint8Array.of(1, 2))).rejects.toThrow("SYNC_UPDATE_ID_REUSED");
    expect((await lyrics!.getLyric(alice, lyric.id))!.body).toBe(client.getText("body").toString());

    for (let index = 1; index < 100; index++) {
      let delta: Uint8Array<ArrayBufferLike> = new Uint8Array();
      client.once("update", (value) => { delta = value; });
      client.getText("body").insert(client.getText("body").length, String(index % 10));
      await sync!.applyUpdate(alice, mapping!.document_key, randomUUID(), delta);
    }
    const stats = await pool!.query<{ updates: string; receipts: string; projected: boolean }>(`select
      (select count(*)::text from sync_updates where document_key=$1) updates,
      (select count(*)::text from sync_update_receipts where document_key=$1) receipts,
      projected_at is not null and projection_error_code is null projected
      from sync_documents where document_key=$1`, [mapping!.document_key]);
    expect(stats.rows[0]).toEqual({ updates: "0", receipts: "100", projected: true });

    await pool!.query("update lyrics set body='stale projection' where resource_id=$1", [lyric.id]);
    await pool!.query("update sync_documents set projection_error_code='SYNC_PROJECTION_FAILED' where document_key=$1", [mapping!.document_key]);
    expect(await sync!.retryPendingProjections()).toEqual({ attempted: 1, recovered: 1 });
    expect((await lyrics!.getLyric(alice, lyric.id))!.body).toBe(client.getText("body").toString());
    expect((await sync!.operationalMetrics()).pendingProjections).toBe(0);

    const restarted = new CollaborationStore(databaseUrl);
    const recovered = await restarted.loadDocument(alice, mapping!.document_key);
    expect(materialize(recovered!.snapshot, recovered!.updates).getText("body").toString()).toBe(client.getText("body").toString());
    await restarted.close(); client.destroy();
    await lyrics!.deleteLyric(alice, lyric.id);
    expect(await sync!.applyUpdate(alice, mapping!.document_key, randomUUID(), update)).toBeNull();
  });

  it("reuses owner-only CRDT projection and revisions for rhyme notes", async () => {
    const [alice, bob] = users as [string, string];
    const rhyme = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "라임 노트", body: "air\r\nchair" }))).rhyme;
    const mapping = await sync!.ensureDocument(alice, rhyme.id);
    expect(mapping).toMatchObject({ resource_type: "rhyme_note" });
    expect(await sync!.ensureDocument(bob, rhyme.id)).toBeNull();
    const loaded = (await sync!.loadDocument(alice, mapping!.document_key))!;
    expect(loaded.resourceType).toBe("rhyme_note");
    const document = materialize(loaded.snapshot, loaded.updates);
    const vector = Y.encodeStateVector(document);
    document.getText("body").insert(document.getText("body").length, "\nflare 🎵");
    await sync!.applyUpdate(alice, mapping!.document_key, randomUUID(), Y.encodeStateAsUpdate(document, vector));
    expect((await rhymes!.getRhymeNote(alice, rhyme.id))!.body).toBe("air\nchair\nflare 🎵");
    const revision = await sync!.checkpoint(alice, mapping!.document_key, "leave");
    expect(revision).toMatchObject({ reason: "leave" });
    expect((await sync!.listRevisions(alice, mapping!.document_key))!.items).toHaveLength(1);
    await rhymes!.deleteRhymeNote(alice, rhyme.id);
    expect(await sync!.loadDocument(alice, mapping!.document_key)).toBeNull();
    document.destroy();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([sync?.close(), songs?.close(), lyrics?.close(), rhymes?.close(), pool?.end()]);
});
