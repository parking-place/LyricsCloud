import { randomUUID } from "node:crypto";
import {
  isResourceId, LyricConflictError, LYRIC_LIMITS,
  parseCreateLyricInput, parseLyricRequestId, parseUpdateLyricInput,
  type CreateLyricInput, type LyricRecord, type LyricStatus, type UpdateLyricInput
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface LyricRow extends QueryResultRow {
  id: string; song_id: string; title: string; body: string; memo: string; status: LyricStatus;
  is_favorite: boolean; is_pinned: boolean; pin_order: number | null;
  row_version: string; created_at: Date; updated_at: Date;
}
type CreatedLyric = { lyric: LyricRecord; replayed: boolean };

// All reads explicitly scope both the child and the active parent to the owner.
const LYRIC_SELECT = `select r.id, r.title, r.is_favorite, r.is_pinned, r.pin_order,
  r.row_version, r.created_at, r.updated_at, l.song_id, l.body, l.memo, l.status
  from resources r join lyrics l on l.resource_id = r.id and l.owner_id = r.owner_id
  join resources parent on parent.id = l.song_id and parent.owner_id = r.owner_id and parent.type = 'song'
  where r.type = 'lyrics' and r.deleted_at is null and parent.deleted_at is null`;

export class PostgresLyricStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 8) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  createLyric(ownerId: string, value: CreateLyricInput): Promise<CreatedLyric | null> {
    const input = parseCreateLyricInput(value, value.songId);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, input.requestId);
      const replay = await replayRequest(client, ownerId, input.requestId, "create", input.songId);
      if (replay !== undefined) return replay;
      if (!await lockSong(client, ownerId, input.songId)) return null;
      return insertLyric(client, ownerId, input, "create", input.songId);
    });
  }

  getLyric(ownerId: string, resourceId: string): Promise<LyricRecord | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, (client) => selectLyric(client, ownerId, resourceId));
  }

  updateLyricCurrent(ownerId: string, resourceId: string, value: UpdateLyricInput): Promise<LyricRecord | null> {
    const input = parseUpdateLyricInput(value);
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const current = await lockLyric(client, ownerId, resourceId);
      if (!current) return null;
      if (current.rowVersion !== input.rowVersion) throw new LyricConflictError();
      if (input.body !== undefined) {
        const sync = await client.query("select 1 from sync_documents where resource_id=$1 and owner_id=$2", [resourceId, ownerId]);
        if (sync.rowCount) throw new LyricConflictError();
      }
      const changes: string[] = [];
      const values: unknown[] = [resourceId, ownerId];
      for (const [field, column] of [["title", "title"], ["isFavorite", "is_favorite"], ["isPinned", "is_pinned"], ["pinOrder", "pin_order"]] as const) {
        if (input[field] !== undefined) { values.push(input[field]); changes.push(`${column} = $${values.length}`); }
      }
      if (changes.length) await client.query(`update resources set ${changes.join(", ")} where id = $1 and owner_id = $2 and deleted_at is null`, values);
      const lyricChanges: string[] = [];
      const lyricValues: unknown[] = [resourceId, ownerId];
      for (const field of ["body", "memo", "status"] as const) {
        if (input[field] !== undefined) { lyricValues.push(input[field]); lyricChanges.push(`${field} = $${lyricValues.length}`); }
      }
      if (lyricChanges.length) await client.query(`update lyrics set ${lyricChanges.join(", ")} where resource_id = $1 and owner_id = $2`, lyricValues);
      return selectLyric(client, ownerId, resourceId);
    });
  }

  duplicateLyric(ownerId: string, resourceId: string, value: { readonly requestId: string }): Promise<CreatedLyric | null> {
    const requestId = parseLyricRequestId(value);
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, requestId);
      const replay = await replayRequest(client, ownerId, requestId, "duplicate", resourceId);
      if (replay !== undefined) return replay;
      const source = await lockLyric(client, ownerId, resourceId);
      if (!source) return null;
      const suffix = " (복사본)";
      return insertLyric(client, ownerId, {
        songId: source.songId, requestId,
        title: [...source.title].slice(0, LYRIC_LIMITS.title - [...suffix].length).join("") + suffix,
        body: source.body, memo: source.memo, status: source.status
      }, "duplicate", resourceId);
    });
  }

  deleteLyric(ownerId: string, resourceId: string): Promise<boolean> {
    if (!isResourceId(resourceId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      if (!await lockLyric(client, ownerId, resourceId)) return false;
      const result = await client.query(`update resources set deleted_at = clock_timestamp(), deletion_batch_id = $3
        where id = $1 and owner_id = $2 and type = 'lyrics' and deleted_at is null`, [resourceId, ownerId, randomUUID()]);
      return result.rowCount === 1;
    });
  }

  listSongLyrics(ownerId: string, songId: string): Promise<LyricRecord[] | null> {
    if (!isResourceId(songId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const parent = await client.query(`select 1 from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
        where r.id = $1 and r.owner_id = $2 and r.type = 'song' and r.deleted_at is null`, [songId, ownerId]);
      if (!parent.rowCount) return null;
      const rows = await client.query<LyricRow>(`${LYRIC_SELECT} and r.owner_id = $1 and l.song_id = $2 order by r.updated_at desc, r.id desc`, [ownerId, songId]);
      return rows.rows.map(mapLyric);
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
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

async function selectLyric(client: PoolClient, ownerId: string, resourceId: string): Promise<LyricRecord | null> {
  const result = await client.query<LyricRow>(`${LYRIC_SELECT} and r.owner_id = $1 and r.id = $2`, [ownerId, resourceId]);
  return result.rows[0] ? mapLyric(result.rows[0]) : null;
}
async function lockSong(client: PoolClient, ownerId: string, songId: string): Promise<boolean> {
  const result = await client.query(`select r.id from resources r join songs s on s.resource_id = r.id and s.owner_id = r.owner_id
    where r.id = $1 and r.owner_id = $2 and r.type = 'song' and r.deleted_at is null for update of r`, [songId, ownerId]);
  return result.rowCount === 1;
}
async function lockLyric(client: PoolClient, ownerId: string, resourceId: string): Promise<LyricRecord | null> {
  const before = await selectLyric(client, ownerId, resourceId);
  if (!before || !await lockSong(client, ownerId, before.songId)) return null;
  const result = await client.query<LyricRow>(`${LYRIC_SELECT} and r.owner_id = $1 and r.id = $2 for update of r`, [ownerId, resourceId]);
  return result.rows[0] ? mapLyric(result.rows[0]) : null;
}
async function requestLock(client: PoolClient, ownerId: string, requestId: string): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`lyric-create:${ownerId.toLowerCase()}:${requestId.toLowerCase()}`]);
}
async function replayRequest(client: PoolClient, ownerId: string, requestId: string, operation: string, sourceId: string): Promise<CreatedLyric | null | undefined> {
  const result = await client.query<{ operation: string; source_id: string; resource_id: string }>(
    "select operation, source_id, resource_id from lyric_create_requests where owner_id = $1 and request_id = $2", [ownerId, requestId]);
  const request = result.rows[0];
  if (!request) return undefined;
  if (request.operation !== operation || request.source_id !== sourceId.toLowerCase()) throw new LyricConflictError();
  const lyric = await selectLyric(client, ownerId, request.resource_id);
  return lyric ? { lyric, replayed: true } : null;
}
async function insertLyric(client: PoolClient, ownerId: string, input: CreateLyricInput, operation: string, sourceId: string): Promise<CreatedLyric> {
  const id = randomUUID();
  await client.query("insert into resources(id, owner_id, type, title) values ($1, $2, 'lyrics', $3)", [id, ownerId, input.title]);
  await client.query("insert into lyrics(resource_id, owner_id, song_id, body, memo, status) values ($1,$2,$3,$4,$5,$6)",
    [id, ownerId, input.songId, input.body, input.memo, input.status]);
  await client.query("insert into lyric_create_requests(owner_id, request_id, resource_id, operation, source_id) values ($1,$2,$3,$4,$5)",
    [ownerId, input.requestId, id, operation, sourceId]);
  const lyric = await selectLyric(client, ownerId, id);
  if (!lyric) throw new Error("LYRIC_CREATE_READBACK_FAILED");
  return { lyric, replayed: false };
}
function mapLyric(row: LyricRow): LyricRecord {
  return {
    id: row.id, songId: row.song_id, title: row.title, body: row.body, memo: row.memo, status: row.status,
    isFavorite: row.is_favorite, isPinned: row.is_pinned, pinOrder: row.pin_order,
    rowVersion: Number(row.row_version), createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}
