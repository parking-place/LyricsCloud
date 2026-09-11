import { randomUUID } from "node:crypto";
import { parseCreateSongInput, type SongMoveInput } from "@lyricscloud/domain";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PostgresSongStore,
  SongOrderConflictError,
  SongOrderNotFoundError,
  SongOrderPinGroupError
} from "./songs.js";

const enabled = process.env.AUTH_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const rootPool = enabled ? new Pool({ connectionString: databaseUrl, max: 2 }) : null;
const store = enabled ? new PostgresSongStore(databaseUrl, 6) : null;
const users: string[] = [];

describe.runIf(enabled)("song manual order store", () => {
  beforeAll(async () => {
    if (!rootPool || !store || !/lyricscloud_test(?:\?|$)/.test(databaseUrl)) throw new Error("manual order integration requires lyricscloud_test");
  });

  it("moves by visible anchors without disturbing hidden items and replays once", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C", "D", "E"]) ids.push(await createSong(owner, `${marker}-${name}`));
    const initial = await store!.listSongs(owner, listInput(marker, 20));
    const input = moveInput(ids[4]!, ids[2]!, ids[0]!, initial.orderVersion);
    const moved = await store!.moveSong(owner, input);
    expect(moved).toMatchObject({ changed: true, replayed: false, orderVersion: initial.orderVersion + 1 });
    expect((await store!.moveSong(owner, input))).toMatchObject({ changed: true, replayed: true, orderVersion: moved.orderVersion });
    const ordered = await store!.listSongs(owner, listInput(marker, 20));
    expect(ordered.items.map(({ title }) => title.slice(-1))).toEqual(["A", "B", "E", "C", "D"]);
  });

  it("serializes concurrent versions, rejects foreign and cross-pin anchors, and invalidates cursors", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C", "D"]) ids.push(await createSong(owner, `${marker}-${name}`));
    const [a, b, c, d] = ids;
    const foreign = await createSong(stranger, `${marker}-foreign`);
    const page = await store!.listSongs(owner, listInput(marker, 2));
    expect(page.nextCursor).toEqual(expect.any(String));
    const attempts = await Promise.allSettled([
      store!.moveSong(owner, moveInput(d!, b!, a!, page.orderVersion)),
      store!.moveSong(owner, moveInput(c!, a!, null, page.orderVersion))
    ]);
    expect(attempts.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(({ status }) => status === "rejected")[0]).toMatchObject({ reason: expect.any(SongOrderConflictError) });
    await expect(store!.listSongs(owner, { ...listInput(marker, 2), cursor: page.nextCursor! }))
      .rejects.toBeInstanceOf(SongOrderConflictError);
    const current = await store!.listSongs(owner, listInput(marker, 20));
    await expect(store!.moveSong(owner, moveInput(a!, foreign, null, current.orderVersion)))
      .rejects.toBeInstanceOf(SongOrderNotFoundError);
    await store!.setPin(owner, a!, true, 0);
    const pinned = await store!.listSongs(owner, listInput(marker, 20));
    await expect(store!.moveSong(owner, moveInput(a!, b!, null, pinned.orderVersion)))
      .rejects.toBeInstanceOf(SongOrderPinGroupError);
  });

  it("keeps a soft-deleted song's rank and restores it in the same place", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C"]) ids.push(await createSong(owner, `${marker}-${name}`));
    const [a, b, c] = ids;
    const before = await rootPool!.query<{ sort_rank: string }>(`select sort_rank::text from library_order_items
      where owner_id=$1 and resource_type='song' and resource_id=$2`, [owner, b]);
    expect(await store!.deleteSong(owner, b!)).toBe(true);
    expect((await store!.listSongs(owner, listInput(marker, 20))).items.map(({ id }) => id)).toEqual([a, c]);
    await rootPool!.query("update resources set deleted_at=null where owner_id=$1 and id=$2", [owner, b]);
    const restored = await store!.listSongs(owner, listInput(marker, 20));
    expect(restored.items.map(({ id }) => id)).toEqual([a, b, c]);
    expect((await rootPool!.query<{ sort_rank: string }>(`select sort_rank::text from library_order_items
      where owner_id=$1 and resource_type='song' and resource_id=$2`, [owner, b])).rows[0])
      .toEqual(before.rows[0]);
  });

  it("rebalances only the exhausted pin group within a bounded transaction", async () => {
    const owner = await createUser();
    const marker = randomUUID().slice(0, 8);
    const ids: string[] = [];
    for (const name of ["A", "B", "C"]) ids.push(await createSong(owner, `${marker}-${name}`));
    const pinned = await createSong(owner, `${marker}-P`);
    await store!.setPin(owner, pinned, true, 0);
    for (let index = 0; index < ids.length; index += 1) {
      await rootPool!.query(`update library_order_items set sort_rank=$3
        where owner_id=$1 and resource_type='song' and resource_id=$2`, [owner, ids[index], index + 1]);
    }
    const pinnedRank = (await rootPool!.query<{ sort_rank: string }>(`select sort_rank::text from library_order_items
      where owner_id=$1 and resource_type='song' and resource_id=$2`, [owner, pinned])).rows[0]!.sort_rank;
    const current = await store!.listSongs(owner, listInput(marker, 20));
    const started = performance.now();
    await store!.moveSong(owner, moveInput(ids[2]!, ids[1]!, ids[0]!, current.orderVersion));
    expect(performance.now() - started).toBeLessThan(3_000);
    const ranks = await rootPool!.query<{ resource_id: string; sort_rank: string }>(`select resource_id,sort_rank::text
      from library_order_items where owner_id=$1 and resource_type='song' and pin_group=false order by sort_rank`, [owner]);
    expect(ranks.rows.map(({ resource_id }) => resource_id)).toEqual([ids[0], ids[2], ids[1]]);
    expect(ranks.rows.map(({ sort_rank }) => sort_rank)).toEqual(["1048576", "2097152", "3145728"]);
    expect((await rootPool!.query<{ sort_rank: string }>(`select sort_rank::text from library_order_items
      where owner_id=$1 and resource_type='song' and resource_id=$2`, [owner, pinned])).rows[0]!.sort_rank).toBe(pinnedRank);
  });

  afterAll(async () => {
    if (rootPool && users.length) await rootPool.query("delete from app_users where id=any($1::uuid[])", [users]);
    await store?.close(); await rootPool?.end();
  });
});

async function createUser(): Promise<string> {
  const id = (await rootPool!.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
  users.push(id); return id;
}

async function createSong(ownerId: string, title: string): Promise<string> {
  return (await store!.createSong(ownerId, parseCreateSongInput({ requestId: randomUUID(), title }))).song.id;
}

function listInput(search: string, limit: number) {
  return { search, work: "all" as const, sort: "manual" as const, limit };
}

function moveInput(itemId: string, beforeId: string | null, afterId: string | null, expectedVersion: number): SongMoveInput {
  return { requestId: randomUUID(), itemId, beforeId, afterId, expectedVersion };
}
