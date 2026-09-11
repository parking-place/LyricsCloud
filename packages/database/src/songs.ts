import { createHash, randomUUID } from "node:crypto";
import type {
  CreateSongInput,
  ResourceColor,
  SongListInput,
  SongMoveInput,
  SongLinkListInput,
  SongLinkMutationInput,
  SongLinkResourceType,
  SongSort,
  SongStatus,
  UpdateSongInput
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PIN_RANK = "case when r.is_pinned then 0 else 1 end";
const PIN_KEY = "coalesce(r.pin_order, 2147483647)";
const ORDER_GAP = 1_048_576n;

export interface SongRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: SongStatus;
  readonly color: ResourceColor | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly rowVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lyricCount: number;
}

export interface SongDashboard extends SongRecord {
  readonly counts: SongDashboardCounts;
}

export interface SongDashboardCounts {
  readonly lyrics: { readonly value: number; readonly available: true };
  readonly prompts: { readonly value: number; readonly available: true };
  readonly rhymes: { readonly value: number; readonly available: true };
}

export interface SongListResult {
  readonly items: readonly SongRecord[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly orderVersion: number;
  readonly capabilities: { readonly lyricsSearch: true; readonly linkedResourceFilters: true; readonly manualOrder: true };
}

export interface SongMoveResult {
  readonly itemId: string;
  readonly beforeId: string | null;
  readonly afterId: string | null;
  readonly orderVersion: number;
  readonly changed: boolean;
  readonly replayed: boolean;
}

export interface SongLinkItem {
  readonly id: string;
  readonly type: SongLinkResourceType;
  readonly title: string;
  readonly preview: string;
  readonly isLinked: boolean;
  readonly updatedAt: string;
}

export interface SongLinkListResult {
  readonly items: readonly SongLinkItem[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
}

export interface SongLinkMutationResult {
  readonly linkedIds: readonly string[];
  readonly unlinkedIds: readonly string[];
}

export class SongCursorError extends Error {
  constructor() { super("SONG_CURSOR_INVALID"); this.name = "SongCursorError"; }
}

export class SongOrderConflictError extends Error {
  constructor(readonly currentVersion: number) { super("SONG_ORDER_VERSION_CONFLICT"); this.name = "SongOrderConflictError"; }
}

export class SongOrderNotFoundError extends Error {
  constructor() { super("SONG_ORDER_ITEM_NOT_FOUND"); this.name = "SongOrderNotFoundError"; }
}

export class SongOrderPinGroupError extends Error {
  constructor() { super("SONG_ORDER_PIN_GROUP_MISMATCH"); this.name = "SongOrderPinGroupError"; }
}

export class SongOrderRequestReuseError extends Error {
  constructor() { super("SONG_ORDER_REQUEST_REUSED"); this.name = "SongOrderRequestReuseError"; }
}

interface SongRow extends QueryResultRow {
  id: string;
  title: string;
  is_favorite: boolean;
  is_pinned: boolean;
  pin_order: number | null;
  color: ResourceColor | null;
  row_version: string;
  created_at: Date;
  updated_at: Date;
  created_cursor: string;
  updated_cursor: string;
  status: SongStatus;
  description: string;
  work_notes: string;
  sort_title: string;
  lyric_count: string;
  manual_rank: string | null;
}

interface SongCursor {
  readonly version: 1 | 2;
  readonly sort: SongSort;
  readonly pinRank: number;
  readonly pinKey?: number;
  readonly orderVersion?: number;
  readonly favoriteRank?: number;
  readonly value: string;
  readonly id: string;
}

interface SongDashboardCountRow extends QueryResultRow {
  lyric_count: string;
  prompt_count: string;
  rhyme_count: string;
}

interface SongLinkRow extends QueryResultRow {
  id: string;
  title: string;
  preview: string;
  is_linked: boolean;
  updated_at: Date;
}

interface SongLinkCursor {
  readonly version: 1;
  readonly offset: number;
  readonly signature: string;
}

export class PostgresSongStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 8) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  createSong(ownerId: string, input: CreateSongInput): Promise<{ song: SongRecord; replayed: boolean }> {
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`song-create:${ownerId}:${input.requestId}`]);
      const existing = await client.query<SongRow>(`${SONG_SELECT}
        join song_create_requests request on request.resource_id = r.id and request.owner_id = r.owner_id
        where request.owner_id = $1 and request.request_id = $2`, [ownerId, input.requestId]);
      if (existing.rows[0]) return { song: mapSong(existing.rows[0]), replayed: true };

      await lockSongOrder(client, ownerId);
      await ensureSongOrder(client, ownerId);
      const resourceId = randomUUID();
      await client.query(`
        insert into resources(id, owner_id, type, title, is_favorite, is_pinned, pin_order, color)
        values ($1, $2, 'song', $3, $4, $5, $6, $7)
      `, [resourceId, ownerId, input.title, input.isFavorite, input.isPinned, input.pinOrder, input.color]);
      await client.query(`
        insert into songs(resource_id, owner_id, status, description, work_notes)
        values ($1, $2, $3, $4, $5)
      `, [resourceId, ownerId, input.status, input.description, input.workNotes]);
      await client.query(`
        insert into song_create_requests(owner_id, request_id, resource_id)
        values ($1, $2, $3)
      `, [ownerId, input.requestId, resourceId]);
      await appendSongOrderItem(client, ownerId, resourceId, input.isPinned);
      const created = await selectSong(client, ownerId, resourceId, false);
      if (!created) throw new Error("SONG_CREATE_READBACK_FAILED");
      return { song: created, replayed: false };
    });
  }

  getSong(ownerId: string, resourceId: string): Promise<SongDashboard | null> {
    return this.#withUser(ownerId, async (client) => {
      const song = await selectSong(client, ownerId, resourceId, true);
      if (!song) return null;
      const counts = await selectDashboardCounts(client, ownerId, resourceId);
      return counts ? { ...song, counts } : null;
    });
  }

  getSongSummary(ownerId: string, resourceId: string): Promise<SongRecord | null> {
    return this.#withUser(ownerId, (client) => selectSong(client, ownerId, resourceId, true));
  }

  getSongDashboardCounts(ownerId: string, resourceId: string): Promise<SongDashboardCounts | null> {
    return this.#withUser(ownerId, (client) => selectDashboardCounts(client, ownerId, resourceId));
  }

  updateSong(ownerId: string, resourceId: string, input: UpdateSongInput): Promise<SongRecord | null> {
    return this.#withUser(ownerId, async (client) => {
      if (!await activeSongExists(client, ownerId, resourceId)) return null;
      if (input.title !== undefined) {
        await client.query("update resources set title = $3 where id = $1 and owner_id = $2 and deleted_at is null", [resourceId, ownerId, input.title]);
      }
      const songChanges: string[] = [];
      const values: unknown[] = [resourceId, ownerId];
      if (input.description !== undefined) { values.push(input.description); songChanges.push(`description = $${values.length}`); }
      if (input.workNotes !== undefined) { values.push(input.workNotes); songChanges.push(`work_notes = $${values.length}`); }
      if (input.status !== undefined) { values.push(input.status); songChanges.push(`status = $${values.length}`); }
      if (songChanges.length) {
        await client.query(`update songs set ${songChanges.join(", ")} where resource_id = $1 and owner_id = $2`, values);
      }
      return selectSong(client, ownerId, resourceId, true);
    });
  }

  setFavorite(ownerId: string, resourceId: string, value: boolean): Promise<SongRecord | null> {
    return this.#updateResource(ownerId, resourceId, "is_favorite", value);
  }

  setPin(ownerId: string, resourceId: string, value: boolean, pinOrder: number | null): Promise<SongRecord | null> {
    return this.#withUser(ownerId, async (client) => {
      await lockSongOrder(client, ownerId);
      await ensureSongOrder(client, ownerId);
      const current = await client.query<{ is_pinned: boolean }>(`select is_pinned from resources
        where id=$1 and owner_id=$2 and type='song' and deleted_at is null for update`, [resourceId, ownerId]);
      if (!current.rows[0]) return null;
      const result = await client.query(`
        update resources set is_pinned = $3, pin_order = $4
        where id = $1 and owner_id = $2 and type = 'song' and deleted_at is null returning id
      `, [resourceId, ownerId, value, pinOrder]);
      if (current.rows[0].is_pinned !== value) {
        const maximum = await client.query<{ rank: string }>(`select coalesce(max(sort_rank),0)::text rank
          from library_order_items where owner_id=$1 and resource_type='song' and pin_group=$2`, [ownerId, value]);
        await client.query(`update library_order_items set pin_group=$3,sort_rank=$4,updated_at=clock_timestamp()
          where owner_id=$1 and resource_type='song' and resource_id=$2`,
        [ownerId, resourceId, value, (BigInt(maximum.rows[0]?.rank ?? "0") + ORDER_GAP).toString()]);
        await bumpSongOrderVersion(client, ownerId);
      }
      return result.rowCount === 1 ? selectSong(client, ownerId, resourceId, true) : null;
    });
  }

  setColor(ownerId: string, resourceId: string, value: ResourceColor | null): Promise<SongRecord | null> {
    return this.#updateResource(ownerId, resourceId, "color", value);
  }

  deleteSong(ownerId: string, resourceId: string): Promise<boolean> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<{ changed: boolean }>("select soft_delete_song($1) as changed", [resourceId]);
      return result.rows[0]?.changed ?? false;
    });
  }

  listSongs(ownerId: string, input: SongListInput): Promise<SongListResult> {
    return this.#withUser(ownerId, async (client) => {
      await lockSongOrder(client, ownerId);
      const orderVersion = await ensureSongOrder(client, ownerId);
      const values: unknown[] = [ownerId];
      const conditions = ["r.owner_id = $1", "r.type = 'song'", "r.deleted_at is null"];
      if (input.search) {
        values.push(input.search);
        conditions.push(`(
          strpos(lower(r.title), lower($${values.length})) > 0
          or strpos(lower(s.description), lower($${values.length})) > 0
          or strpos(lower(s.work_notes), lower($${values.length})) > 0
          or exists (
            select 1 from lyrics search_lyric
            join resources search_resource on search_resource.id = search_lyric.resource_id
              and search_resource.owner_id = search_lyric.owner_id
            where search_lyric.song_id = r.id and search_lyric.owner_id = r.owner_id
              and search_resource.type = 'lyrics' and search_resource.deleted_at is null
              and (
                strpos(lower(search_resource.title), lower($${values.length})) > 0
                or strpos(lower(search_lyric.body), lower($${values.length})) > 0
              )
          )
        )`);
      }
      if (input.status) {
        values.push(input.status);
        conditions.push(`s.status = $${values.length}`);
      }
      if (input.work === "has_linked_resources") {
        conditions.push(`exists (
          select 1 from song_resource_links work_link
          join resources linked_resource on linked_resource.id = work_link.linked_resource_id
            and linked_resource.owner_id = work_link.owner_id
          where work_link.owner_id = r.owner_id and work_link.song_resource_id = r.id
            and linked_resource.deleted_at is null
        )`);
      }
      if (input.work === "no_lyrics") {
        conditions.push(`not exists (
          select 1 from lyrics work_lyric
          join resources lyric_resource on lyric_resource.id = work_lyric.resource_id
            and lyric_resource.owner_id = work_lyric.owner_id
          where work_lyric.owner_id = r.owner_id and work_lyric.song_id = r.id
            and lyric_resource.deleted_at is null
        )`);
      }

      const baseWhere = conditions.join(" and ");
      const count = await client.query<{ count: string }>(`
        select count(*)::text as count from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
        where ${baseWhere}
      `, values);

      if (input.cursor) {
        const cursor = decodeCursor(input.cursor, input.sort, orderVersion);
        conditions.push(cursorCondition(cursor, values));
      }
      values.push(input.limit + 1);
      const rows = await client.query<SongRow>(`${SONG_SELECT}
        where ${conditions.join(" and ")}
        order by ${sortOrder(input.sort)}
        limit $${values.length}
      `, values);
      const hasMore = rows.rows.length > input.limit;
      const pageRows = hasMore ? rows.rows.slice(0, input.limit) : rows.rows;
      const last = pageRows.at(-1);
      return {
        items: pageRows.map(mapSong),
        totalCount: Number(count.rows[0]?.count ?? 0),
        nextCursor: hasMore && last ? encodeCursor(makeCursor(last, input.sort, orderVersion)) : null,
        orderVersion,
        capabilities: { lyricsSearch: true, linkedResourceFilters: true, manualOrder: true }
      };
    });
  }

  moveSong(ownerId: string, input: SongMoveInput): Promise<SongMoveResult> {
    return this.#withUser(ownerId, async (client) => {
      await lockSongOrder(client, ownerId);
      await ensureSongOrder(client, ownerId);
      const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const replay = await client.query<{ request_sha256: string; result_version: string; changed: boolean }>(`
        select request_sha256,result_version,changed from library_order_move_requests
        where owner_id=$1 and resource_type='song' and request_id=$2`, [ownerId, input.requestId]);
      if (replay.rows[0]) {
        if (replay.rows[0].request_sha256 !== requestHash) throw new SongOrderRequestReuseError();
        return { itemId: input.itemId, beforeId: input.beforeId, afterId: input.afterId,
          orderVersion: Number(replay.rows[0].result_version), changed: replay.rows[0].changed, replayed: true };
      }

      const state = await client.query<{ row_version: string }>(`select row_version from library_order_states
        where owner_id=$1 and resource_type='song' for update`, [ownerId]);
      const currentVersion = Number(state.rows[0]!.row_version);
      if (currentVersion !== input.expectedVersion) throw new SongOrderConflictError(currentVersion);

      const requestedIds = [input.itemId, input.beforeId, input.afterId].filter((id): id is string => id !== null);
      const requested = await client.query<{ id: string; is_pinned: boolean }>(`select id,is_pinned from resources
        where owner_id=$1 and type='song' and deleted_at is null and id=any($2::uuid[]) for update`, [ownerId, requestedIds]);
      if (requested.rowCount !== new Set(requestedIds).size) throw new SongOrderNotFoundError();
      const groups = new Set(requested.rows.map((row) => row.is_pinned));
      if (groups.size !== 1) throw new SongOrderPinGroupError();
      const pinGroup = requested.rows[0]!.is_pinned;

      const ordered = await client.query<{ resource_id: string; sort_rank: string }>(`select resource_id,sort_rank::text
        from library_order_items where owner_id=$1 and resource_type='song' and pin_group=$2
        order by library_order_items.sort_rank,resource_id for update`, [ownerId, pinGroup]);
      const original = ordered.rows.map((row) => row.resource_id);
      const without = original.filter((id) => id !== input.itemId);
      const beforeIndex = input.beforeId === null ? -1 : without.indexOf(input.beforeId);
      const afterIndex = input.afterId === null ? -1 : without.indexOf(input.afterId);
      if ((input.beforeId !== null && beforeIndex < 0) || (input.afterId !== null && afterIndex < 0)) throw new SongOrderNotFoundError();
      if (beforeIndex >= 0 && afterIndex >= 0 && afterIndex >= beforeIndex) throw new SongOrderConflictError(currentVersion);
      const insertionIndex = beforeIndex >= 0 ? beforeIndex : afterIndex + 1;
      const nextOrder = [...without.slice(0, insertionIndex), input.itemId, ...without.slice(insertionIndex)];
      const changed = nextOrder.some((id, index) => id !== original[index]);
      let resultVersion = currentVersion;
      if (changed) {
        let previousRank = insertionIndex === 0 ? 0n : BigInt(ordered.rows.find((row) => row.resource_id === without[insertionIndex - 1])!.sort_rank);
        let nextRank = insertionIndex === without.length ? previousRank + ORDER_GAP * 2n
          : BigInt(ordered.rows.find((row) => row.resource_id === without[insertionIndex])!.sort_rank);
        if (nextRank - previousRank <= 1n) {
          await rebalanceSongOrderGroup(client, ownerId, pinGroup, nextOrder);
        } else {
          await client.query(`update library_order_items set sort_rank=$4,updated_at=clock_timestamp()
            where owner_id=$1 and resource_type='song' and resource_id=$2 and pin_group=$3`,
          [ownerId, input.itemId, pinGroup, ((previousRank + nextRank) / 2n).toString()]);
        }
        resultVersion = await bumpSongOrderVersion(client, ownerId);
      }
      await client.query(`insert into library_order_move_requests(
        owner_id,resource_type,request_id,request_sha256,item_id,before_id,after_id,expected_version,result_version,changed
      ) values($1,'song',$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ownerId, input.requestId, requestHash, input.itemId, input.beforeId, input.afterId,
        input.expectedVersion, resultVersion, changed]);
      return { itemId: input.itemId, beforeId: input.beforeId, afterId: input.afterId,
        orderVersion: resultVersion, changed, replayed: false };
    });
  }

  listSongLinks(ownerId: string, songId: string, input: SongLinkListInput): Promise<SongLinkListResult | null> {
    return this.#withUser(ownerId, async (client) => {
      if (!await activeSongExists(client, ownerId, songId)) return null;
      const resourceType = input.type;
      const subtypeTable = input.type === "prompt" ? "prompts" : "rhyme_notes";
      const previewColumn = input.type === "prompt" ? "plain_text" : "body";
      const values: unknown[] = [ownerId, songId];
      const linkedExpression = `exists(select 1 from song_resource_links link
        where link.owner_id=r.owner_id and link.song_resource_id=$2 and link.linked_resource_id=r.id
          and link.linked_resource_type='${resourceType}')`;
      const conditions = ["r.owner_id=$1", "$2::uuid is not null", `r.type='${resourceType}'`, "r.deleted_at is null"];
      if (input.search) {
        values.push(input.search);
        conditions.push(`(strpos(lower(r.title),lower($${values.length}))>0
          or strpos(lower(subtype.${previewColumn}),lower($${values.length}))>0)`);
      }
      if (input.state === "linked") conditions.push(linkedExpression);
      if (input.state === "unlinked") conditions.push(`not ${linkedExpression}`);
      const where = conditions.join(" and ");
      const totalCount = Number((await client.query<{ count: string }>(`select count(*)::text count
        from resources r join ${subtypeTable} subtype on subtype.resource_id=r.id and subtype.owner_id=r.owner_id
        where ${where}`, values)).rows[0]?.count ?? 0);
      const offset = input.cursor ? decodeSongLinkCursor(input.cursor, input).offset : 0;
      values.push(input.limit + 1, offset);
      const rows = await client.query<SongLinkRow>(`select r.id,r.title,subtype.${previewColumn} preview,
        ${linkedExpression} is_linked,r.updated_at
        from resources r join ${subtypeTable} subtype on subtype.resource_id=r.id and subtype.owner_id=r.owner_id
        where ${where}
        order by is_linked desc,lower(r.title),r.id limit $${values.length - 1} offset $${values.length}`, values);
      const hasMore = rows.rows.length > input.limit;
      const page = hasMore ? rows.rows.slice(0, input.limit) : rows.rows;
      return {
        items: page.map((row) => ({ id: row.id, type: input.type, title: row.title, preview: row.preview,
          isLinked: row.is_linked, updatedAt: row.updated_at.toISOString() })),
        totalCount,
        nextCursor: hasMore ? encodeSongLinkCursor({ version: 1, offset: offset + input.limit,
          signature: songLinkQuerySignature(input) }) : null
      };
    });
  }

  changeSongLinks(ownerId: string, songId: string, input: SongLinkMutationInput): Promise<SongLinkMutationResult | null> {
    return this.#withUser(ownerId, async (client) => {
      const song = await client.query(`select r.id from resources r join songs s on s.resource_id=r.id and s.owner_id=r.owner_id
        where r.id=$1 and r.owner_id=$2 and r.type='song' and r.deleted_at is null for update of r`, [songId, ownerId]);
      if (!song.rowCount) return null;
      const ids = [...input.linkIds, ...input.unlinkIds];
      const resources = await client.query<{ id: string }>(`select id from resources
        where owner_id=$1 and type=$2 and id=any($3::uuid[]) and deleted_at is null for update`, [ownerId, input.type, ids]);
      if (resources.rowCount !== ids.length) return null;
      if (input.linkIds.length) {
        await client.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
          select $1,$2,id,$3 from unnest($4::uuid[]) as selected(id) on conflict do nothing`,
        [ownerId, songId, input.type, input.linkIds]);
      }
      if (input.unlinkIds.length) {
        await client.query(`delete from song_resource_links where owner_id=$1 and song_resource_id=$2
          and linked_resource_type=$3 and linked_resource_id=any($4::uuid[])`, [ownerId, songId, input.type, input.unlinkIds]);
      }
      await client.query("update resources set updated_at=clock_timestamp() where owner_id=$1 and id=any($2::uuid[])", [ownerId, ids]);
      return { linkedIds: input.linkIds, unlinkedIds: input.unlinkIds };
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  #updateResource(ownerId: string, resourceId: string, column: "is_favorite" | "color", value: boolean | ResourceColor | null): Promise<SongRecord | null> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query(`
        update resources set ${column} = $3
        where id = $1 and owner_id = $2 and type = 'song' and deleted_at is null returning id
      `, [resourceId, ownerId, value]);
      return result.rowCount === 1 ? selectSong(client, ownerId, resourceId, true) : null;
    });
  }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!UUID.test(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id', $1, true)", [ownerId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

const SONG_SELECT = `
  select r.id, r.title, r.is_favorite, r.is_pinned, r.pin_order, r.color, r.row_version,
         r.created_at, r.updated_at,
         to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_cursor,
         to_char(r.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_cursor,
         s.status, s.description, s.work_notes, lower(r.title) as sort_title,
         manual_order.sort_rank::text as manual_rank,
         (select count(*)::text from lyrics l join resources lr on lr.id = l.resource_id and lr.owner_id = l.owner_id
          where l.song_id = r.id and l.owner_id = r.owner_id and lr.type = 'lyrics' and lr.deleted_at is null) as lyric_count
  from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
  left join library_order_items manual_order on manual_order.resource_id=r.id
    and manual_order.owner_id=r.owner_id and manual_order.resource_type='song'
`;

async function lockSongOrder(client: PoolClient, ownerId: string): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`library-order:${ownerId}:song`]);
}

async function ensureSongOrder(client: PoolClient, ownerId: string): Promise<number> {
  await client.query(`insert into library_order_states(owner_id,resource_type) values($1,'song') on conflict do nothing`, [ownerId]);
  const inserted = await client.query<{ count: string }>(`with missing as (
      select r.id,r.is_pinned,row_number() over(partition by r.is_pinned order by r.pin_order nulls last,r.updated_at desc,r.id desc) sequence
      from resources r left join library_order_items item on item.owner_id=r.owner_id
        and item.resource_type='song' and item.resource_id=r.id
      where r.owner_id=$1 and r.type='song' and item.resource_id is null
    ), maxima as (
      select pin_group,coalesce(max(sort_rank),0) maximum from library_order_items
      where owner_id=$1 and resource_type='song' group by pin_group
    ), added as (
      insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
      select $1,'song',missing.id,missing.is_pinned,
        coalesce(maxima.maximum,0) + missing.sequence * 1048576
      from missing left join maxima on maxima.pin_group=missing.is_pinned
      returning 1
    ) select count(*)::text count from added`, [ownerId]);
  const added = Number(inserted.rows[0]?.count ?? 0);
  if (added) await client.query(`update library_order_states set row_version=row_version+$2,updated_at=clock_timestamp()
    where owner_id=$1 and resource_type='song'`, [ownerId, added]);
  const state = await client.query<{ row_version: string }>(`select row_version from library_order_states
    where owner_id=$1 and resource_type='song'`, [ownerId]);
  return Number(state.rows[0]!.row_version);
}

async function appendSongOrderItem(client: PoolClient, ownerId: string, resourceId: string, pinGroup: boolean): Promise<void> {
  const maximum = await client.query<{ rank: string }>(`select coalesce(max(sort_rank),0)::text rank
    from library_order_items where owner_id=$1 and resource_type='song' and pin_group=$2`, [ownerId, pinGroup]);
  await client.query(`insert into library_order_items(owner_id,resource_type,resource_id,pin_group,sort_rank)
    values($1,'song',$2,$3,$4)`, [ownerId, resourceId, pinGroup,
    (BigInt(maximum.rows[0]?.rank ?? "0") + ORDER_GAP).toString()]);
  await bumpSongOrderVersion(client, ownerId);
}

async function bumpSongOrderVersion(client: PoolClient, ownerId: string): Promise<number> {
  const result = await client.query<{ row_version: string }>(`update library_order_states
    set row_version=row_version+1,updated_at=clock_timestamp()
    where owner_id=$1 and resource_type='song' returning row_version::text`, [ownerId]);
  return Number(result.rows[0]!.row_version);
}

async function rebalanceSongOrderGroup(
  client: PoolClient,
  ownerId: string,
  pinGroup: boolean,
  orderedIds: readonly string[]
): Promise<void> {
  await client.query("set constraints library_order_items_group_rank deferred");
  await client.query(`update library_order_items item set sort_rank=ranked.sort_rank,updated_at=clock_timestamp()
    from (
      select id,(ordinality * 1048576)::bigint sort_rank
      from unnest($3::uuid[]) with ordinality as sequence(id,ordinality)
    ) ranked
    where item.owner_id=$1 and item.resource_type='song' and item.pin_group=$2 and item.resource_id=ranked.id`,
  [ownerId, pinGroup, orderedIds]);
}

async function selectSong(client: PoolClient, ownerId: string, resourceId: string, activeOnly: boolean): Promise<SongRecord | null> {
  const result = await client.query<SongRow>(`${SONG_SELECT}
    where r.id = $1 and r.owner_id = $2 and r.type = 'song' ${activeOnly ? "and r.deleted_at is null" : ""}
  `, [resourceId, ownerId]);
  return result.rows[0] ? mapSong(result.rows[0]) : null;
}

async function activeSongExists(client: PoolClient, ownerId: string, resourceId: string): Promise<boolean> {
  const result = await client.query(`
    select 1 from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
    where r.id = $1 and r.owner_id = $2 and r.type = 'song' and r.deleted_at is null
  `, [resourceId, ownerId]);
  return result.rowCount === 1;
}

function mapSong(row: SongRow): SongRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    workNotes: row.work_notes,
    status: row.status,
    color: row.color,
    isFavorite: row.is_favorite,
    isPinned: row.is_pinned,
    pinOrder: row.pin_order,
    rowVersion: Number(row.row_version),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lyricCount: Number(row.lyric_count)
  };
}

async function selectDashboardCounts(
  client: PoolClient,
  ownerId: string,
  resourceId: string
): Promise<SongDashboardCounts | null> {
  const result = await client.query<SongDashboardCountRow>(`
    select
      (select count(*)::text from lyrics l
        join resources lyric_resource on lyric_resource.id = l.resource_id and lyric_resource.owner_id = l.owner_id
        where l.owner_id = song.owner_id and l.song_id = song.id
          and lyric_resource.type = 'lyrics' and lyric_resource.deleted_at is null) as lyric_count,
      (select count(*)::text from song_resource_links link
        join resources prompt_resource on prompt_resource.id = link.linked_resource_id and prompt_resource.owner_id = link.owner_id
        where link.owner_id = song.owner_id and link.song_resource_id = song.id and link.linked_resource_type = 'prompt'
          and prompt_resource.type = 'prompt' and prompt_resource.deleted_at is null) as prompt_count,
      (select count(*)::text from song_resource_links link
        join resources rhyme_resource on rhyme_resource.id = link.linked_resource_id and rhyme_resource.owner_id = link.owner_id
        where link.owner_id = song.owner_id and link.song_resource_id = song.id and link.linked_resource_type = 'rhyme_note'
          and rhyme_resource.type = 'rhyme_note' and rhyme_resource.deleted_at is null) as rhyme_count
    from resources song
    where song.id = $1 and song.owner_id = $2 and song.type = 'song' and song.deleted_at is null
  `, [resourceId, ownerId]);
  const row = result.rows[0];
  return row ? {
    lyrics: { value: Number(row.lyric_count), available: true },
    prompts: { value: Number(row.prompt_count), available: true },
    rhymes: { value: Number(row.rhyme_count), available: true }
  } : null;
}

function sortOrder(sort: SongSort): string {
  if (sort === "manual") return `${PIN_RANK} asc, manual_order.sort_rank asc, r.id asc`;
  const prefix = `${PIN_RANK} asc, ${PIN_KEY} asc`;
  if (sort === "created_desc") return `${prefix}, r.created_at desc, r.id desc`;
  if (sort === "created_asc") return `${prefix}, r.created_at asc, r.id asc`;
  if (sort === "title_asc") return `${prefix}, lower(r.title) asc, r.id asc`;
  if (sort === "favorite_first") return `${prefix}, case when r.is_favorite then 0 else 1 end asc, r.updated_at desc, r.id desc`;
  return `${prefix}, r.updated_at desc, r.id desc`;
}

function makeCursor(row: SongRow, sort: SongSort, orderVersion: number): SongCursor {
  if (sort === "manual") return {
    version: 2, sort, pinRank: row.is_pinned ? 0 : 1, orderVersion,
    value: row.manual_rank ?? "0", id: row.id
  };
  return {
    version: 1,
    sort,
    pinRank: row.is_pinned ? 0 : 1,
    pinKey: row.pin_order ?? 2_147_483_647,
    ...(sort === "favorite_first" ? { favoriteRank: row.is_favorite ? 0 : 1 } : {}),
    value: sort === "title_asc" ? row.sort_title
      : sort.startsWith("created_") ? row.created_cursor
        : row.updated_cursor,
    id: row.id
  };
}

function encodeCursor(cursor: SongCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string, sort: SongSort, orderVersion: number): SongCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SongCursor>;
    const validValue = typeof parsed.value === "string" && parsed.value.length > 0;
    const expectedCursorVersion = sort === "manual" ? 2 : 1;
    if (parsed.version !== expectedCursorVersion || parsed.sort !== sort || ![0, 1].includes(parsed.pinRank as number)
      || (sort !== "manual" && !Number.isInteger(parsed.pinKey)) || !validValue
      || typeof parsed.id !== "string" || !UUID.test(parsed.id)) {
      throw new SongCursorError();
    }
    if (sort === "manual" && parsed.orderVersion !== orderVersion) throw new SongOrderConflictError(orderVersion);
    if (sort === "favorite_first" && ![0, 1].includes(parsed.favoriteRank as number)) throw new SongCursorError();
    return parsed as SongCursor;
  } catch (error) {
    if (error instanceof SongCursorError || error instanceof SongOrderConflictError) throw error;
    throw new SongCursorError();
  }
}

function cursorCondition(cursor: SongCursor, values: unknown[]): string {
  if (cursor.sort === "manual") {
    values.push(cursor.pinRank, cursor.value, cursor.id);
    const pin = `$${values.length - 2}`;
    const rank = `$${values.length - 1}`;
    const id = `$${values.length}`;
    return `(${PIN_RANK} > ${pin} or (${PIN_RANK} = ${pin} and
      (manual_order.sort_rank > ${rank}::bigint or (manual_order.sort_rank = ${rank}::bigint and r.id > ${id}))))`;
  }
  values.push(cursor.pinRank, cursor.pinKey);
  const rank = `$${values.length - 1}`;
  const pin = `$${values.length}`;
  const samePrefix = `${PIN_RANK} = ${rank} and ${PIN_KEY} = ${pin}`;
  const prefixAfter = `${PIN_RANK} > ${rank} or (${PIN_RANK} = ${rank} and ${PIN_KEY} > ${pin})`;

  if (cursor.sort === "favorite_first") {
    values.push(cursor.favoriteRank, cursor.value, cursor.id);
    const favorite = `$${values.length - 2}`;
    const date = `$${values.length - 1}`;
    const id = `$${values.length}`;
    const favoriteRank = "case when r.is_favorite then 0 else 1 end";
    return `(${prefixAfter} or (${samePrefix} and (
      ${favoriteRank} > ${favorite}
      or (${favoriteRank} = ${favorite} and (r.updated_at < ${date} or (r.updated_at = ${date} and r.id < ${id})))
    )))`;
  }

  values.push(cursor.value, cursor.id);
  const value = `$${values.length - 1}`;
  const id = `$${values.length}`;
  const field = cursor.sort === "title_asc" ? "lower(r.title)"
    : cursor.sort.startsWith("created_") ? "r.created_at" : "r.updated_at";
  const direction = cursor.sort === "title_asc" || cursor.sort === "created_asc" ? ">" : "<";
  return `(${prefixAfter} or (${samePrefix} and (${field} ${direction} ${value} or (${field} = ${value} and r.id ${direction} ${id}))))`;
}

function songLinkQuerySignature(input: SongLinkListInput): string {
  return createHash("sha256").update(JSON.stringify([input.type, input.state, input.search ?? "", input.limit]))
    .digest("base64url").slice(0, 20);
}

function encodeSongLinkCursor(cursor: SongLinkCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeSongLinkCursor(value: string, input: SongLinkListInput): SongLinkCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SongLinkCursor>;
    if (parsed.version !== 1 || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0
      || parsed.signature !== songLinkQuerySignature(input)) throw new SongCursorError();
    return parsed as SongLinkCursor;
  } catch (error) {
    if (error instanceof SongCursorError) throw error;
    throw new SongCursorError();
  }
}
