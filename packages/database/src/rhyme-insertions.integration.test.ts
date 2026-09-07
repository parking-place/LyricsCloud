import { randomUUID } from "node:crypto";
import { parseCreateLyricInput, parseCreateRhymeNoteInput, parseCreateSongInput, RHYME_INSERTION_CONTRACT_VERSION } from "@lyricscloud/domain";
import { Pool } from "pg";
import * as Y from "yjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresLyricStore } from "./lyrics.js";
import { PostgresRhymeInsertionStore } from "./rhyme-insertions.js";
import { PostgresRhymeStore } from "./rhymes.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const insertions = enabled ? new PostgresRhymeInsertionStore(databaseUrl) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl) : null;
const lyrics = enabled ? new PostgresLyricStore(databaseUrl) : null;
const rhymes = enabled ? new PostgresRhymeStore(databaseUrl) : null;
const users: string[] = [];

describe.runIf(enabled)("rhyme insertion owner and CRDT validation", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("rhyme insertion integration requires lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("validates exact source selection and target cursor inside one owner", async () => {
    const [alice, bob] = users as [string, string];
    const song = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: "삽입 대상 곡" }))).song;
    const lyric = (await lyrics!.createLyric(alice, parseCreateLyricInput({ requestId: randomUUID(), title: "대상", body: "앞 뒤" }, song.id)))!.lyric;
    const rhyme = (await rhymes!.createRhymeNote(alice, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: "소스", body: "air chair flare" }))).rhyme;
    const source = (await insertions!.getSource(alice, rhyme.id))!;
    expect(source.body).toBe("air chair flare");

    const targetDocument = textDocument(lyric.body);
    const targetKey = (await pool!.query<{ document_key: string }>(`insert into sync_documents(resource_id,owner_id,resource_type,snapshot,projected_at)
      values($1,$2,'lyrics',$3,statement_timestamp()) returning document_key`, [lyric.id, alice, Buffer.from(Y.encodeStateAsUpdate(targetDocument))])).rows[0]!.document_key;
    const sourceDocument = new Y.Doc();
    Y.applyUpdate(sourceDocument, Buffer.from(source.snapshot, "base64url"));
    const request = {
      version: RHYME_INSERTION_CONTRACT_VERSION,
      requestId: randomUUID(),
      source: { resourceId: rhyme.id, documentKey: source.documentKey,
        anchorRelativePosition: relative(sourceDocument, 4), headRelativePosition: relative(sourceDocument, 9) },
      target: { resourceId: lyric.id, documentKey: targetKey, relativePosition: relative(targetDocument, 2) },
      text: "chair"
    };
    expect(await insertions!.validate(alice, request)).toEqual({ valid: true, text: "chair" });
    expect(await insertions!.validate(alice, { ...request, text: "flare" })).toEqual({ valid: false, reason: "source_changed" });
    expect(await insertions!.validate(alice, { ...request, source: { ...request.source, documentKey: randomUUID() } }))
      .toEqual({ valid: false, reason: "source_changed" });
    expect(await insertions!.validate(alice, { ...request, source: { ...request.source, anchorRelativePosition: "invalid" } }))
      .toEqual({ valid: false, reason: "source_changed" });
    expect(await insertions!.validate(alice, { ...request, target: { ...request.target, documentKey: randomUUID() } }))
      .toEqual({ valid: false, reason: "target_changed" });
    expect(await insertions!.validate(alice, { ...request, target: { ...request.target, relativePosition: "invalid" } }))
      .toEqual({ valid: false, reason: "target_changed" });
    expect(await insertions!.validate(bob, request)).toEqual({ valid: false, reason: "target_deleted" });
    await lyrics!.deleteLyric(alice, lyric.id);
    expect(await insertions!.validate(alice, request)).toEqual({ valid: false, reason: "target_deleted" });
    sourceDocument.destroy(); targetDocument.destroy();
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([insertions?.close(), songs?.close(), lyrics?.close(), rhymes?.close(), pool?.end()]);
});

function textDocument(body: string) {
  const document = new Y.Doc();
  if (body) document.getText("body").insert(0, body);
  return document;
}

function relative(document: Y.Doc, index: number): string {
  return Buffer.from(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(document.getText("body"), index))).toString("base64url");
}
