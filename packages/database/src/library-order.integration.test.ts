import { randomUUID } from "node:crypto";
import { parseCreatePromptInput, parseCreateRhymeNoteInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LibraryOrderConflictError, LibraryOrderPinGroupError } from "./library-order.js";
import { PostgresPromptStore } from "./prompts.js";
import { PostgresRhymeStore } from "./rhymes.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const rhymes = enabled ? new PostgresRhymeStore(databaseUrl, 4) : null;
const prompts = enabled ? new PostgresPromptStore(databaseUrl, 4) : null;
const users: string[] = [];

describe.runIf(enabled)("rhyme and prompt manual order store", () => {
  beforeAll(async () => {
    if (!pool || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("manual order integration requires lyricscloud_test");
  });

  it("moves rhyme cards independently and restores a deleted card at its rank", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C"]) ids.push(
      (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker}-${name}`, body: name }))).rhyme.id);
    const initial = await rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 20 });
    const moved = await rhymes!.moveRhymeNote(owner, move(ids[2]!, ids[1]!, ids[0]!, initial.orderVersion));
    expect(moved).toMatchObject({ changed: true, replayed: false, orderVersion: initial.orderVersion + 1 });
    expect((await rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 20 })).items.map(({ title }) => title.slice(-1)))
      .toEqual(["A", "C", "B"]);
    await rhymes!.deleteRhymeNote(owner, ids[2]!);
    await pool!.query("update resources set deleted_at=null where owner_id=$1 and id=$2", [owner, ids[2]]);
    expect((await rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 20 })).items.map(({ title }) => title.slice(-1)))
      .toEqual(["A", "C", "B"]);
  });

  it("moves prompt cards without changing prompt token order or copy payload", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const first = (await prompts!.createPrompt(owner, parseCreatePromptInput({ requestId: randomUUID(), title: `${marker}-A`, tokens: ["one", "two", "three"] }))).prompt;
    const second = (await prompts!.createPrompt(owner, parseCreatePromptInput({ requestId: randomUUID(), title: `${marker}-B`, tokens: ["four"] }))).prompt;
    const third = (await prompts!.createPrompt(owner, parseCreatePromptInput({ requestId: randomUUID(), title: `${marker}-C`, tokens: ["five"] }))).prompt;
    const before = await prompts!.getPrompt(owner, first.id);
    const page = await prompts!.listPrompts(owner, { search: marker, sort: "manual", limit: 20, favoriteOnly: false, recentlyUsedOnly: false });
    const firstMove = await prompts!.movePrompt(owner, move(third.id, first.id, null, page.orderVersion));
    const secondMove = await prompts!.movePrompt(owner, move(second.id, third.id, null, firstMove.orderVersion));
    expect(firstMove.changed).toBe(true);
    expect(secondMove.changed).toBe(true);
    expect((await prompts!.listPrompts(owner, { search: marker, sort: "manual", limit: 20, favoriteOnly: false, recentlyUsedOnly: false })).items.map(({ id }) => id))
      .toEqual([second.id, third.id, first.id]);
    expect(await prompts!.getPrompt(owner, first.id)).toMatchObject({ plainText: before!.plainText, tokens: before!.tokens });
  });

  it("invalidates manual cursors and rejects cross-pin anchors", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C"]) ids.push(
      (await rhymes!.createRhymeNote(owner, parseCreateRhymeNoteInput({ requestId: randomUUID(), title: `${marker}-${name}`, body: name }))).rhyme.id);
    const page = await rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 1 });
    await rhymes!.moveRhymeNote(owner, move(ids[2]!, ids[1]!, ids[0]!, page.orderVersion));
    await expect(rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 1, cursor: page.nextCursor! }))
      .rejects.toBeInstanceOf(LibraryOrderConflictError);
    await rhymes!.setPin(owner, ids[0]!, true, 0);
    const current = await rhymes!.listRhymeNotes(owner, { search: marker, sort: "manual", limit: 20 });
    await expect(rhymes!.moveRhymeNote(owner, move(ids[0]!, ids[1]!, null, current.orderVersion)))
      .rejects.toBeInstanceOf(LibraryOrderPinGroupError);
  });

  afterAll(async () => {
    if (pool && users.length) await pool.query("delete from app_users where id=any($1::uuid[])", [users]);
    await rhymes?.close(); await prompts?.close(); await pool?.end();
  });
});

async function createUser(): Promise<string> {
  const id = (await pool!.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
  users.push(id); return id;
}

function move(itemId: string, beforeId: string | null, afterId: string | null, expectedVersion: number) {
  return { requestId: randomUUID(), itemId, beforeId, afterId, expectedVersion };
}
