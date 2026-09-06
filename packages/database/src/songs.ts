import { randomUUID } from "node:crypto";
import type {
  CreateSongInput,
  ResourceColor,
  SongListInput,
  SongSort,
  SongStatus,
  UpdateSongInput
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PIN_RANK = "case when r.is_pinned then 0 else 1 end";
const PIN_KEY = "coalesce(r.pin_order, 2147483647)";

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
  readonly counts: {
    readonly lyrics: { readonly value: number; readonly available: true };
    readonly prompts: { readonly value: 0; readonly available: false };
    readonly rhymes: { readonly value: 0; readonly available: false };
  };
}

export interface SongListResult {
  readonly items: readonly SongRecord[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly capabilities: { readonly lyricsSearch: true; readonly linkedResourceFilters: false };
}

export class SongCursorError extends Error {
  constructor() { super("SONG_CURSOR_INVALID"); this.name = "SongCursorError"; }
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
}

interface SongCursor {
  readonly version: 1;
  readonly sort: SongSort;
  readonly pinRank: number;
  readonly pinKey: number;
  readonly favoriteRank?: number;
  readonly value: string;
  readonly id: string;
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
      const created = await selectSong(client, ownerId, resourceId, false);
      if (!created) throw new Error("SONG_CREATE_READBACK_FAILED");
      return { song: created, replayed: false };
    });
  }

  getSong(ownerId: string, resourceId: string): Promise<SongDashboard | null> {
    return this.#withUser(ownerId, async (client) => {
      const song = await selectSong(client, ownerId, resourceId, true);
      return song ? dashboard(song) : null;
    });
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
      const result = await client.query(`
        update resources set is_pinned = $3, pin_order = $4
        where id = $1 and owner_id = $2 and type = 'song' and deleted_at is null returning id
      `, [resourceId, ownerId, value, pinOrder]);
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

      const baseWhere = conditions.join(" and ");
      const count = await client.query<{ count: string }>(`
        select count(*)::text as count from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
        where ${baseWhere}
      `, values);

      if (input.cursor) {
        const cursor = decodeCursor(input.cursor, input.sort);
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
        nextCursor: hasMore && last ? encodeCursor(makeCursor(last, input.sort)) : null,
        capabilities: { lyricsSearch: true, linkedResourceFilters: false }
      };
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
         (select count(*)::text from lyrics l join resources lr on lr.id = l.resource_id and lr.owner_id = l.owner_id
          where l.song_id = r.id and l.owner_id = r.owner_id and lr.type = 'lyrics' and lr.deleted_at is null) as lyric_count
  from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
`;

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

function dashboard(song: SongRecord): SongDashboard {
  return {
    ...song,
    counts: {
      lyrics: { value: song.lyricCount, available: true },
      prompts: { value: 0, available: false },
      rhymes: { value: 0, available: false }
    }
  };
}

function sortOrder(sort: SongSort): string {
  const prefix = `${PIN_RANK} asc, ${PIN_KEY} asc`;
  if (sort === "created_desc") return `${prefix}, r.created_at desc, r.id desc`;
  if (sort === "created_asc") return `${prefix}, r.created_at asc, r.id asc`;
  if (sort === "title_asc") return `${prefix}, lower(r.title) asc, r.id asc`;
  if (sort === "favorite_first") return `${prefix}, case when r.is_favorite then 0 else 1 end asc, r.updated_at desc, r.id desc`;
  return `${prefix}, r.updated_at desc, r.id desc`;
}

function makeCursor(row: SongRow, sort: SongSort): SongCursor {
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

function decodeCursor(value: string, sort: SongSort): SongCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SongCursor>;
    const validValue = typeof parsed.value === "string" && parsed.value.length > 0;
    if (parsed.version !== 1 || parsed.sort !== sort || ![0, 1].includes(parsed.pinRank as number)
      || !Number.isInteger(parsed.pinKey) || !validValue || typeof parsed.id !== "string" || !UUID.test(parsed.id)) {
      throw new SongCursorError();
    }
    if (sort === "favorite_first" && ![0, 1].includes(parsed.favoriteRank as number)) throw new SongCursorError();
    return parsed as SongCursor;
  } catch (error) {
    if (error instanceof SongCursorError) throw error;
    throw new SongCursorError();
  }
}

function cursorCondition(cursor: SongCursor, values: unknown[]): string {
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
