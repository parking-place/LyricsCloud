import { randomUUID } from "node:crypto";
import { parseCreatePromptInput, parseCreateSongInput, parseUpdatePromptInput, PromptConflictError } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresPromptStore } from "./prompts.js";
import { PostgresSongStore } from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl }) : null;
const prompts = enabled ? new PostgresPromptStore(databaseUrl, 4) : null;
const songs = enabled ? new PostgresSongStore(databaseUrl, 2) : null;
const users: string[] = [];

describe.runIf(enabled)("prompt PostgreSQL contract", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("requires isolated lyricscloud_test");
    for (let index = 0; index < 2; index++) users.push((await pool.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id);
  });

  it("projects first-display unique tokens and deduplicates create/clone retries", async () => {
    const owner = users[0]!;
    const requestId = randomUUID();
    const input = parseCreatePromptInput({ requestId, title: "합성 Prompt", color: "blue", tokens: [
      "Ｆｅｍａｌｅ  Vocal", "female vocal", "몽환적", "808 bass"
    ] });
    const first = await prompts!.createPrompt(owner, input);
    expect(first.prompt).toMatchObject({ title: "합성 Prompt", plainText: "Ｆｅｍａｌｅ  Vocal, 몽환적, 808 bass", color: "blue" });
    expect(first.prompt.tokens.map((token) => token.normalizedValue)).toEqual(["female vocal", "몽환적", "808 bass"]);
    expect(await prompts!.createPrompt(owner, input)).toMatchObject({ replayed: true, prompt: { id: first.prompt.id } });
    await expect(prompts!.createPrompt(owner, { ...input, title: "요청 재사용" })).rejects.toBeInstanceOf(PromptConflictError);
    expect((await prompts!.listSuggestions(owner, "female"))[0]).toMatchObject({ displayValue: "Ｆｅｍａｌｅ  Vocal", usageCount: 1 });

    const cloneRequest = randomUUID();
    const clone = await prompts!.duplicatePrompt(owner, first.prompt.id, cloneRequest);
    expect(clone).toMatchObject({ replayed: false, prompt: { title: "합성 Prompt 복사본", plainText: first.prompt.plainText } });
    expect(await prompts!.duplicatePrompt(owner, first.prompt.id, cloneRequest)).toMatchObject({ replayed: true, prompt: { id: clone!.prompt.id } });
    expect((await prompts!.listSuggestions(owner, "female"))[0]?.usageCount).toBe(2);
  });

  it("makes updates idempotent and keeps sequence order deterministic", async () => {
    const owner = users[0]!;
    const original = (await prompts!.createPrompt(owner, parseCreatePromptInput({
      requestId: randomUUID(), title: "순서", tokens: ["one", "two", "three"]
    }))).prompt;
    const requestId = randomUUID();
    const update = parseUpdatePromptInput({ requestId, rowVersion: original.rowVersion, title: "새 순서", tokens: ["three", "one", "THREE", "four"] });
    const written = await prompts!.updatePrompt(owner, original.id, update);
    expect(written?.prompt).toMatchObject({ title: "새 순서", plainText: "three, one, four" });
    expect(written?.prompt.tokens.map((token) => token.displayValue)).toEqual(["three", "one", "four"]);
    expect(await prompts!.updatePrompt(owner, original.id, update)).toMatchObject({ replayed: true, prompt: { id: original.id } });
    await expect(prompts!.updatePrompt(owner, original.id, { ...update, title: "변조" })).rejects.toBeInstanceOf(PromptConflictError);
  });

  it("isolates token history and song links by owner, and unlink preserves originals", async () => {
    const [alice, bob] = users as [string, string];
    const prompt = (await prompts!.createPrompt(alice, parseCreatePromptInput({ requestId: randomUUID(), title: "Alice", tokens: ["alice-private"] }))).prompt;
    const aliceSong = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: "Alice song" }))).song;
    const retainedSong = (await songs!.createSong(alice, parseCreateSongInput({ requestId: randomUUID(), title: "Retained song" }))).song;
    const bobSong = (await songs!.createSong(bob, parseCreateSongInput({ requestId: randomUUID(), title: "Bob song" }))).song;
    await prompts!.createPrompt(bob, parseCreatePromptInput({ requestId: randomUUID(), title: "Bob", tokens: ["bob-private"] }));
    expect(await prompts!.listSuggestions(alice, "bob")).toEqual([]);
    expect(await prompts!.listSuggestions(bob, "alice")).toEqual([]);
    expect(await prompts!.getPrompt(bob, prompt.id)).toBeNull();
    expect(await prompts!.linkSong(alice, prompt.id, bobSong.id)).toBe(false);
    expect(await prompts!.linkSong(alice, prompt.id, aliceSong.id)).toBe(true);
    expect(await prompts!.linkSong(alice, prompt.id, retainedSong.id)).toBe(true);
    expect(await prompts!.linkSong(alice, prompt.id, aliceSong.id)).toBe(false);
    expect(await prompts!.unlinkSong(alice, prompt.id, aliceSong.id)).toBe(true);
    expect(await prompts!.getPrompt(alice, prompt.id)).toMatchObject({ linkedSongIds: [retainedSong.id], plainText: "alice-private" });
    expect(await prompts!.listSongCandidates(alice, prompt.id, "song")).toEqual([
      { id: retainedSong.id, title: "Retained song", isLinked: true },
      { id: aliceSong.id, title: "Alice song", isLinked: false }
    ]);
    expect(await prompts!.listSongCandidates(bob, prompt.id)).toBeNull();
    expect(await songs!.getSong(alice, aliceSong.id)).not.toBeNull();
  });

  it("soft-deletes only the prompt and excludes it from reads and new links", async () => {
    const owner = users[0]!;
    const prompt = (await prompts!.createPrompt(owner, parseCreatePromptInput({ requestId: randomUUID(), title: "삭제", tokens: ["history-stays"] }))).prompt;
    const song = (await songs!.createSong(owner, parseCreateSongInput({ requestId: randomUUID(), title: "보존 곡" }))).song;
    expect(await prompts!.deletePrompt(owner, prompt.id)).toBe(true);
    expect(await prompts!.deletePrompt(owner, prompt.id)).toBe(false);
    expect(await prompts!.getPrompt(owner, prompt.id)).toBeNull();
    expect(await prompts!.listSongCandidates(owner, prompt.id)).toBeNull();
    expect(await prompts!.linkSong(owner, prompt.id, song.id)).toBe(false);
    expect(await songs!.getSong(owner, song.id)).not.toBeNull();
    expect(await prompts!.listSuggestions(owner, "history")).toMatchObject([{ usageCount: 1 }]);
  });
});

afterAll(async () => {
  if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
  await Promise.all([prompts?.close(), songs?.close(), pool?.end()]);
});
