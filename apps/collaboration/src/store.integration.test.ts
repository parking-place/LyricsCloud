import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreatePromptInput, parseCreateRhymeNoteInput, parseCreateSongInput } from "@lyricscloud/domain";
import { PostgresLyricSharingStore, PostgresLyricStore, PostgresPromptStore, PostgresRhymeStore, PostgresSongStore } from "@lyricscloud/database";
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
const prompts = enabled ? new PostgresPromptStore(databaseUrl, 2) : null;
const sharing = enabled ? new PostgresLyricSharingStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("durable owner-only collaboration state", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("collaboration integration requires lyricscloud_test");
    for (let index = 0; index < 2; index++) {
      const id = (await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
      users.push(id);
      await pool.query("insert into user_profiles(owner_id,display_name) values($1,$2)", [id, `협업 사용자 ${index + 1}`]);
    }
  });

  it("retries later valid documents beyond deleted and permanently failing batches without clearing failed markers", async () => {
    const owner = (await pool!.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
    const retryStore = new CollaborationStore(databaseUrl);
    const oversized = new Y.Doc();
    oversized.getText("body").insert(0, "x".repeat(100_001));
    const invalidSnapshot = Buffer.from(Y.encodeStateAsUpdate(oversized));
    oversized.destroy();
    try {
      const documents: Array<{ id: string; key: string }> = [];
      for (let index = 0; index < 41; index++) {
        const rhyme = (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `retry fixture ${index}`, body: "durable synthetic body" }))).rhyme;
        const mapping = (await retryStore.ensureDocument(owner, rhyme.id))!;
        documents.push({ id: rhyme.id, key: mapping.document_key });
      }
      documents.sort((a, b) => a.key < b.key ? -1 : 1);
      const deleted = documents.slice(0, 20), failing = documents.slice(20, 40), valid = documents[40]!;
      for (const item of deleted) await rhymes!.deleteRhymeNote(owner, item.id);
      await pool!.query("update sync_documents set snapshot=$2 where document_key=any($1::uuid[])", [failing.map((item) => item.key), invalidSnapshot]);
      await pool!.query("update rhyme_notes set body='stale projection' where resource_id=$1", [valid.id]);
      await pool!.query("update sync_documents set projection_error_code='SYNC_PROJECTION_FAILED',updated_at='2020-01-01' where owner_id=$1", [owner]);
      await pool!.query("update sync_documents set updated_at='2021-01-01' where document_key=any($1::uuid[])", [failing.map((item) => item.key)]);
      await pool!.query("update sync_documents set updated_at='2022-01-01' where document_key=$1", [valid.key]);
      const first = await retryStore.retryPendingProjections();
      const second = await retryStore.retryPendingProjections();
      expect(await rhymes!.getRhymeNote(owner, valid.id)).toMatchObject({ body: "durable synthetic body" });
      expect(first).toEqual({ attempted: 20, recovered: 0, failed: 20 });
      expect(second).toEqual({ attempted: 1, recovered: 1, failed: 0 });
      expect((await pool!.query("select count(*)::int count from sync_documents where owner_id=$1 and projection_error_code is not null", [owner])).rows[0]!.count).toBe(40);
      // Repair one fixture; the next bounded pass wraps and retries it.
      const repair = new Y.Doc();
      repair.getText("body").insert(0, "repaired synthetic body");
      await pool!.query("update sync_documents set snapshot=$2 where document_key=$1", [failing[0]!.key, Buffer.from(Y.encodeStateAsUpdate(repair))]);
      repair.destroy();
      expect(await retryStore.retryPendingProjections()).toEqual({ attempted: 20, recovered: 1, failed: 19 });
      expect(await rhymes!.getRhymeNote(owner, failing[0]!.id)).toMatchObject({ body: "repaired synthetic body" });
    } finally {
      await retryStore.close();
      await pool!.query("delete from app_users where id=$1", [owner]);
    }
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
    expect(await sync!.retryPendingProjections()).toEqual({ attempted: 1, recovered: 1, failed: 0 });
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

  it("projects prompt title and unique read tokens while revisions preserve duplicate occurrences", async () => {
    const [alice, bob] = users as [string, string];
    const prompt = (await prompts!.createPrompt(alice, parseCreatePromptInput({
      requestId: randomUUID(), title: "초기 프롬프트", tokens: ["hyperpop", "female vocal"]
    }))).prompt;
    const mapping = await sync!.ensureDocument(alice, prompt.id);
    expect(mapping).toMatchObject({ resource_type: "prompt" });
    expect(await sync!.ensureDocument(bob, prompt.id)).toBeNull();
    const loaded = (await sync!.loadDocument(alice, mapping!.document_key))!;
    const document = materialize(loaded.snapshot, loaded.updates);
    const vector = Y.encodeStateVector(document);
    const title = document.getText("prompt-title");
    title.delete(0, title.length); title.insert(0, "동기화 프롬프트 🎵");
    document.getArray("prompt-tokens").insert(2, [
      { occurrenceId: "duplicate-female", displayValue: "Ｆｅｍａｌｅ  Vocal" },
      { occurrenceId: "new-bass", displayValue: "808 bass" }
    ]);
    await sync!.applyUpdate(alice, mapping!.document_key, randomUUID(), Y.encodeStateAsUpdate(document, vector));
    expect(await prompts!.getPrompt(alice, prompt.id)).toMatchObject({
      title: "동기화 프롬프트 🎵", plainText: "hyperpop, female vocal, 808 bass"
    });
    const before = await sync!.checkpoint(alice, mapping!.document_key, "large_paste");
    expect(before).toMatchObject({ reason: "large_paste" });

    const nextVector = Y.encodeStateVector(document);
    title.delete(0, title.length); title.insert(0, "복원 전 제목");
    await sync!.applyUpdate(alice, mapping!.document_key, randomUUID(), Y.encodeStateAsUpdate(document, nextVector));
    const history = await sync!.listRevisions(alice, mapping!.document_key);
    const restored = await sync!.restoreRevision(alice, mapping!.document_key, before!.id, {
      requestId: randomUUID(), expectedHash: history!.current.hash
    });
    expect(restored).toMatchObject({ duplicate: false });
    expect(await prompts!.getPrompt(alice, prompt.id)).toMatchObject({
      title: "동기화 프롬프트 🎵", plainText: "hyperpop, female vocal, 808 bass"
    });
    const restoredDocument = materialize((await sync!.loadDocument(alice, mapping!.document_key))!.snapshot, []);
    expect(restoredDocument.getArray("prompt-tokens").toArray()).toContainEqual({
      occurrenceId: "duplicate-female", displayValue: "Ｆｅｍａｌｅ  Vocal"
    });
    document.destroy(); restoredDocument.destroy();
  });

  it("requires the prompt mode capability and preserves sentence mode through projection and revision restore", async () => {
    const alice = users[0]!;
    const raw = "  cinematic, not tags.\r\n문장  원문 🙂  ";
    const prompt = (await prompts!.createPrompt(alice, parseCreatePromptInput({
      requestId: randomUUID(), title: "문장 동기화", mode: "sentence", sentenceText: raw
    }))).prompt;
    await expect(sync!.ensureDocument(alice, prompt.id)).rejects.toThrow("PROMPT_MODE_CAPABILITY_REQUIRED");
    const mapping = (await sync!.ensureDocument(alice, prompt.id, true))!;
    const loaded = (await sync!.loadDocument(alice, mapping.document_key))!;
    expect(loaded).toMatchObject({ resourceType: "prompt", promptMode: "sentence" });
    const document = materialize(loaded.snapshot, loaded.updates);
    expect(document.getMap("prompt-mode").get("value")).toBe("sentence");
    expect(document.getText("prompt-sentence").toString()).toBe(raw);
    const revision = await sync!.checkpoint(alice, mapping.document_key, "large_paste");
    const vector = Y.encodeStateVector(document);
    document.transact(() => {
      const sentence = document.getText("prompt-sentence");
      sentence.delete(0, sentence.length); sentence.insert(0, "바뀐, 문장.\n  공백");
    });
    await sync!.applyUpdate(alice, mapping.document_key, randomUUID(), Y.encodeStateAsUpdate(document, vector));
    expect(await prompts!.getPrompt(alice, prompt.id)).toMatchObject({ mode: "sentence", plainText: "바뀐, 문장.\n  공백" });
    const history = (await sync!.listRevisions(alice, mapping.document_key))!;
    await sync!.restoreRevision(alice, mapping.document_key, revision!.id, { requestId: randomUUID(), expectedHash: history.current.hash });
    expect(await prompts!.getPrompt(alice, prompt.id)).toMatchObject({ mode: "sentence", sentenceText: raw, plainText: raw });
    document.destroy();
  });

  it("commits selected-writer updates with actor epochs and recovers an ACK after downgrade", async () => {
    const [owner, writer] = users as [string, string];
    const writerSharingId = (await pool!.query<{ sharing_id: string }>(
      "select sharing_id from user_profiles where owner_id=$1", [writer])).rows[0]!.sharing_id;
    const song = (await songs!.createSong(owner, parseCreateSongInput({ title: "선택 쓰기 곡", requestId: randomUUID() }))).song;
    const lyric = (await lyrics!.createLyric(owner, parseCreateLyricInput({ title: "선택 쓰기", body: "처음", requestId: randomUUID() }, song.id)))!.lyric;
    const mapping = (await sync!.ensureDocument(owner, lyric.id))!;
    const grant = (await sharing!.grantRead(owner, lyric.id, writerSharingId, randomUUID()))!.grant;
    const writeGrant = (await sharing!.setGrantAccess(owner, lyric.id, grant.id, "write", randomUUID()))!.grant;
    const loaded = (await sync!.loadDocumentForActor(writer, mapping.document_key))!;
    expect(loaded.access).toMatchObject({ actorId: writer, ownerId: owner, accessMode: "write",
      grantId: grant.id, permissionEpoch: grant.permissionEpoch, writeEpoch: writeGrant.writeEpoch });

    const writerDoc = materialize(loaded.snapshot, loaded.updates);
    const vector = Y.encodeStateVector(writerDoc);
    writerDoc.getText("body").insert(writerDoc.getText("body").length, "\n공동 작성");
    const payload = Y.encodeStateAsUpdate(writerDoc, vector);
    const updateId = randomUUID();
    const accepted = await sync!.applyUpdateForActor(loaded.access, mapping.document_key, updateId, payload);
    expect(accepted).toMatchObject({ duplicate: false, sequence: expect.any(Number) });
    expect((await lyrics!.getLyric(owner, lyric.id))!.body).toBe("처음\n공동 작성");
    const audit = (await pool!.query(`select u.actor_id,u.access_mode,u.grant_id,u.permission_epoch::text,u.write_epoch::text,
      r.accepted_sequence::text from sync_updates u join sync_update_receipts r
      on r.document_key=u.document_key and r.update_id=u.update_id where u.document_key=$1 and u.update_id=$2`,
    [mapping.document_key, updateId])).rows[0];
    expect(audit).toEqual({ actor_id: writer, access_mode: "write", grant_id: grant.id,
      permission_epoch: String(grant.permissionEpoch), write_epoch: String(writeGrant.writeEpoch),
      accepted_sequence: String(accepted!.sequence) });

    const downgraded = (await sharing!.setGrantAccess(owner, lyric.id, grant.id, "read", randomUUID()))!.grant;
    expect((await sync!.loadDocumentForActor(writer, mapping.document_key))!.access).toMatchObject({ accessMode: "read",
      writeEpoch: downgraded.writeEpoch });
    await expect(sync!.applyUpdateForActor(loaded.access, mapping.document_key, updateId, payload))
      .resolves.toMatchObject({ duplicate: true, sequence: accepted!.sequence });
    await expect(sync!.applyUpdateForActor(loaded.access, mapping.document_key, updateId, Uint8Array.of(1, 2)))
      .rejects.toThrow("SYNC_UPDATE_ID_REUSED");
    await expect(sync!.applyUpdateForActor(loaded.access, mapping.document_key, randomUUID(), payload)).resolves.toBeNull();

    const reenabled = (await sharing!.setGrantAccess(owner, lyric.id, grant.id, "write", randomUUID()))!.grant;
    expect(reenabled.writeEpoch).toBeGreaterThan(downgraded.writeEpoch);
    const refreshed = (await sync!.loadDocumentForActor(writer, mapping.document_key))!;
    const refreshedDoc = materialize(refreshed.snapshot, refreshed.updates);
    const refreshedVector = Y.encodeStateVector(refreshedDoc);
    refreshedDoc.getText("body").insert(refreshedDoc.getText("body").length, "\n다시 허용");
    await expect(sync!.applyUpdateForActor(refreshed.access, mapping.document_key, randomUUID(),
      Y.encodeStateAsUpdate(refreshedDoc, refreshedVector))).resolves.toMatchObject({ duplicate: false });
    expect((await lyrics!.getLyric(owner, lyric.id))!.body).toBe("처음\n공동 작성\n다시 허용");
    refreshedDoc.destroy();
    writerDoc.destroy();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([sync?.close(), songs?.close(), lyrics?.close(), rhymes?.close(), prompts?.close(), sharing?.close(), pool?.end()]);
});
