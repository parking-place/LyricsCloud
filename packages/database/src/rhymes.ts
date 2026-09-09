import { createHash, randomUUID } from "node:crypto";
import {
  isResourceId, normalizeRhymeTag, parseCreateRhymeNoteInput, parseRhymeRequestId,
  parseUpdateRhymeNoteInput, RHYME_LIMITS, RhymeConflictError,
  type CreateRhymeNoteInput, type RhymeNoteRecord, type RhymeTagRecord,
  type RhymeListInput, type RhymeSongSearchInput, type RhymeSort, type UpdateRhymeNoteInput, type ResourceColor
} from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

interface RhymeRow extends QueryResultRow {
  id: string; title: string; body: string; is_favorite: boolean; is_pinned: boolean;
  pin_order: number | null; color: RhymeNoteRecord["color"]; row_version: string;
  created_at: Date; updated_at: Date;
}
interface TagRow extends QueryResultRow {
  id: string; display_value: string; normalized_value: string; created_at: Date; updated_at: Date;
}
interface RhymeListRow extends RhymeRow {
  tags: unknown;
  linked_songs: unknown;
}
interface RhymeCursor { readonly version: 1; readonly offset: number; readonly signature: string }

export interface RhymeListItem extends RhymeNoteRecord {
  readonly linkedSongs: readonly { readonly id: string; readonly title: string }[];
}
export interface RhymeListResult {
  readonly items: readonly RhymeListItem[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly filters: {
    readonly tags: readonly { readonly id: string; readonly label: string }[];
    readonly songs: readonly { readonly id: string; readonly title: string }[];
  };
}
export interface RhymeSongCandidate {
  readonly id: string;
  readonly title: string;
  readonly isLinked: boolean;
}

export class RhymeCursorError extends Error {
  constructor() { super("RHYME_CURSOR_INVALID"); this.name = "RhymeCursorError"; }
}

export type CreatedRhymeNote = { rhyme: RhymeNoteRecord; replayed: boolean };

const RHYME_SELECT = `select r.id,r.title,n.body,r.is_favorite,r.is_pinned,r.pin_order,r.color,
  r.row_version::text,r.created_at,r.updated_at
  from resources r join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
  where r.type='rhyme_note' and r.deleted_at is null`;

export class PostgresRhymeStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 8) { this.#pool = createDatabasePool(databaseUrl, maxConnections); }

  createRhymeNote(ownerId: string, value: CreateRhymeNoteInput): Promise<CreatedRhymeNote> {
    const input = parseCreateRhymeNoteInput(value);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, input.requestId);
      const requestHash = hashRequest("create", input);
      const replay = await replayRequest(client, ownerId, input.requestId, requestHash);
      if (replay) return replay;
      return insertRhyme(client, ownerId, input, "create", requestHash);
    });
  }

  getRhymeNote(ownerId: string, resourceId: string): Promise<RhymeNoteRecord | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, (client) => selectRhyme(client, ownerId, resourceId));
  }

  listRhymeNotes(ownerId: string, input: RhymeListInput): Promise<RhymeListResult> {
    return this.#withUser(ownerId, async (client) => {
      const values: unknown[] = [ownerId];
      const conditions = ["r.owner_id=$1", "r.type='rhyme_note'", "r.deleted_at is null"];
      if (input.search) {
        values.push(input.search);
        conditions.push(`(strpos(lower(r.title),lower($${values.length}))>0 or strpos(lower(n.body),lower($${values.length}))>0)`);
      }
      if (input.tagId) {
        values.push(input.tagId);
        conditions.push(`exists(select 1 from resource_tags frt join tags ft on ft.id=frt.tag_id and ft.owner_id=frt.owner_id
          where frt.owner_id=r.owner_id and frt.resource_id=r.id and frt.tag_id=$${values.length} and ft.deleted_at is null)`);
      }
      if (input.songId) {
        values.push(input.songId);
        conditions.push(`exists(select 1 from song_resource_links fsl join resources fs on fs.id=fsl.song_resource_id and fs.owner_id=fsl.owner_id
          where fsl.owner_id=r.owner_id and fsl.linked_resource_id=r.id and fsl.linked_resource_type='rhyme_note'
            and fsl.song_resource_id=$${values.length} and fs.type='song' and fs.deleted_at is null)`);
      }
      const where = conditions.join(" and ");
      const count = Number((await client.query<{ count: string }>(`select count(*)::text count from resources r
        join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id where ${where}`, values)).rows[0]?.count ?? 0);
      const offset = input.cursor ? decodeRhymeCursor(input.cursor, input).offset : 0;
      values.push(input.limit + 1, offset);
      const rows = await client.query<RhymeListRow>(`select r.id,r.title,n.body,r.is_favorite,r.is_pinned,r.pin_order,r.color,
        r.row_version::text,r.created_at,r.updated_at,
        coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'displayValue',t.display_value,'normalizedValue',t.normalized_value,
          'createdAt',to_char(t.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'updatedAt',to_char(t.updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) order by t.normalized_value,t.id)
          from resource_tags rt join tags t on t.id=rt.tag_id and t.owner_id=rt.owner_id
          where rt.owner_id=r.owner_id and rt.resource_id=r.id and t.deleted_at is null),'[]'::jsonb) tags,
        coalesce((select jsonb_agg(jsonb_build_object('id',song.id,'title',song.title) order by lower(song.title),song.id)
          from song_resource_links sl join resources song on song.id=sl.song_resource_id and song.owner_id=sl.owner_id
          where sl.owner_id=r.owner_id and sl.linked_resource_id=r.id and sl.linked_resource_type='rhyme_note'
            and song.type='song' and song.deleted_at is null),'[]'::jsonb) linked_songs
        from resources r join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
        where ${where} order by ${rhymeSortOrder(input.sort)} limit $${values.length - 1} offset $${values.length}`, values);
      const hasMore = rows.rows.length > input.limit;
      const page = hasMore ? rows.rows.slice(0, input.limit) : rows.rows;
      const [tags, songs] = await Promise.all([
        client.query<{ id: string; display_value: string }>(`select t.id,t.display_value from tags t where t.owner_id=$1 and t.deleted_at is null
          and exists(select 1 from resource_tags rt join resources rr on rr.id=rt.resource_id and rr.owner_id=rt.owner_id
            where rt.owner_id=t.owner_id and rt.tag_id=t.id and rr.type='rhyme_note' and rr.deleted_at is null)
          order by t.normalized_value,t.id`, [ownerId]),
        client.query<{ id: string; title: string }>(`select r.id,r.title from resources r where r.owner_id=$1 and r.type='song' and r.deleted_at is null
          and exists(select 1 from song_resource_links sl join resources rr on rr.id=sl.linked_resource_id and rr.owner_id=sl.owner_id
            where sl.owner_id=r.owner_id and sl.song_resource_id=r.id and sl.linked_resource_type='rhyme_note'
              and rr.type='rhyme_note' and rr.deleted_at is null) order by lower(r.title),r.id`, [ownerId])
      ]);
      return {
        items: page.map(mapRhymeListItem), totalCount: count,
        nextCursor: hasMore ? encodeRhymeCursor({ version: 1, offset: offset + input.limit, signature: rhymeQuerySignature(input) }) : null,
        filters: { tags: tags.rows.map((tag) => ({ id: tag.id, label: tag.display_value })), songs: songs.rows }
      };
    });
  }

  updateRhymeNote(ownerId: string, resourceId: string, value: UpdateRhymeNoteInput): Promise<RhymeNoteRecord | null> {
    const input = parseUpdateRhymeNoteInput(value);
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const current = await lockRhyme(client, ownerId, resourceId);
      if (!current) return null;
      if (current.rowVersion !== input.rowVersion) throw new RhymeConflictError();
      if (input.body !== undefined) {
        const sync = await client.query("select 1 from sync_documents where resource_id=$1 and owner_id=$2", [resourceId, ownerId]);
        if (sync.rowCount) throw new RhymeConflictError();
      }
      const resourceChanges: string[] = [];
      const resourceValues: unknown[] = [resourceId, ownerId];
      for (const [field, column] of [["title", "title"], ["isFavorite", "is_favorite"], ["isPinned", "is_pinned"], ["pinOrder", "pin_order"], ["color", "color"]] as const) {
        if (input[field] !== undefined) { resourceValues.push(input[field]); resourceChanges.push(`${column}=$${resourceValues.length}`); }
      }
      if (resourceChanges.length) await client.query(`update resources set ${resourceChanges.join(",")} where id=$1 and owner_id=$2 and deleted_at is null`, resourceValues);
      if (input.body !== undefined) await client.query("update rhyme_notes set body=$3 where resource_id=$1 and owner_id=$2", [resourceId, ownerId, input.body]);
      return selectRhyme(client, ownerId, resourceId);
    });
  }

  setFavorite(ownerId: string, resourceId: string, value: boolean): Promise<RhymeNoteRecord | null> {
    return this.#updateResource(ownerId, resourceId, "is_favorite", value);
  }

  setPin(ownerId: string, resourceId: string, value: boolean, pinOrder: number | null): Promise<RhymeNoteRecord | null> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query(`update resources set is_pinned=$3,pin_order=$4
        where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null returning id`, [resourceId, ownerId, value, pinOrder]);
      return result.rowCount ? selectRhyme(client, ownerId, resourceId) : null;
    });
  }

  setColor(ownerId: string, resourceId: string, value: ResourceColor | null): Promise<RhymeNoteRecord | null> {
    return this.#updateResource(ownerId, resourceId, "color", value);
  }

  duplicateRhymeNote(ownerId: string, resourceId: string, value: { readonly requestId: string }): Promise<CreatedRhymeNote | null> {
    const requestId = parseRhymeRequestId(value);
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      await requestLock(client, ownerId, requestId);
      const requestHash = hashRequest("duplicate", { resourceId });
      const replay = await replayRequest(client, ownerId, requestId, requestHash);
      if (replay) return replay;
      const source = await lockRhyme(client, ownerId, resourceId);
      if (!source) return null;
      const suffix = " (복사본)";
      const created = await insertRhyme(client, ownerId, {
        requestId,
        title: [...source.title].slice(0, RHYME_LIMITS.title - [...suffix].length).join("") + suffix,
        body: source.body,
        isFavorite: false,
        isPinned: false,
        pinOrder: null,
        color: source.color
      }, "duplicate", requestHash);
      await client.query(`insert into resource_tags(owner_id,resource_id,tag_id)
        select owner_id,$3,tag_id from resource_tags where owner_id=$1 and resource_id=$2 on conflict do nothing`, [ownerId, resourceId, created.rhyme.id]);
      return { ...created, rhyme: (await selectRhyme(client, ownerId, created.rhyme.id))! };
    });
  }

  deleteRhymeNote(ownerId: string, resourceId: string): Promise<boolean> {
    if (!isResourceId(resourceId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => Boolean((await client.query<{ changed: boolean }>(
      "select soft_delete_rhyme_note($1) changed", [resourceId])).rows[0]?.changed));
  }

  upsertTag(ownerId: string, value: string): Promise<RhymeTagRecord> {
    const tag = normalizeRhymeTag(value);
    return this.#withUser(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`rhyme-tag:${ownerId.toLowerCase()}:${tag.normalizedValue}`]);
      const existing = (await client.query<TagRow>("select id,display_value,normalized_value,created_at,updated_at from tags where owner_id=$1 and normalized_value=$2 for update", [ownerId, tag.normalizedValue])).rows[0];
      if (existing) {
        if (!(await client.query("select deleted_at is null active from tags where id=$1", [existing.id])).rows[0]?.active) {
          const restored = (await client.query<TagRow>(`update tags set display_value=$3,normalized_value=$4,deleted_at=null
            where id=$1 and owner_id=$2 returning id,display_value,normalized_value,created_at,updated_at`, [existing.id, ownerId, tag.displayValue, tag.normalizedValue])).rows[0]!;
          return mapTag(restored);
        }
        return mapTag(existing);
      }
      const created = (await client.query<TagRow>(`insert into tags(owner_id,display_value,normalized_value) values($1,$2,$3)
        returning id,display_value,normalized_value,created_at,updated_at`, [ownerId, tag.displayValue, tag.normalizedValue])).rows[0]!;
      return mapTag(created);
    });
  }

  attachTag(ownerId: string, resourceId: string, tagId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(tagId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const resource = await client.query("select id from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null for update", [resourceId, ownerId]);
      if (!resource.rowCount) return false;
      const existing = await client.query("select 1 from resource_tags where owner_id=$1 and resource_id=$2 and tag_id=$3", [ownerId, resourceId, tagId]);
      if (existing.rowCount) return false;
      const count = Number((await client.query<{ count: string }>("select count(*)::text count from resource_tags where owner_id=$1 and resource_id=$2", [ownerId, resourceId])).rows[0]!.count);
      if (count >= RHYME_LIMITS.tagsPerNote) throw new Error("RHYME_TAG_LIMIT");
      const result = await client.query(`insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)
        on conflict do nothing returning tag_id`, [ownerId, resourceId, tagId]);
      if (!result.rowCount) return false;
      await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return true;
    });
  }

  detachTag(ownerId: string, resourceId: string, tagId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(tagId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const active = await client.query("select id from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null for update", [resourceId, ownerId]);
      if (!active.rowCount) return false;
      const removed = await client.query(
        "delete from resource_tags where owner_id=$1 and resource_id=$2 and tag_id=$3", [ownerId, resourceId, tagId]);
      if (!removed.rowCount) return false;
      await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return true;
    });
  }

  listSongCandidates(ownerId: string, resourceId: string, input: RhymeSongSearchInput): Promise<readonly RhymeSongCandidate[] | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const active = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null", [resourceId, ownerId]);
      if (!active.rowCount) return null;
      const values: unknown[] = [ownerId, resourceId];
      const search = input.search ? "and strpos(lower(song.title),lower($3))>0" : "";
      if (input.search) values.push(input.search);
      values.push(input.limit);
      const rows = await client.query<{ id: string; title: string; is_linked: boolean }>(`select song.id,song.title,
        exists(select 1 from song_resource_links link where link.owner_id=song.owner_id and link.song_resource_id=song.id
          and link.linked_resource_id=$2 and link.linked_resource_type='rhyme_note') is_linked
        from resources song where song.owner_id=$1 and song.type='song' and song.deleted_at is null ${search}
        order by is_linked desc,lower(song.title),song.id limit $${values.length}`, values);
      return rows.rows.map((row) => ({ id: row.id, title: row.title, isLinked: row.is_linked }));
    });
  }

  linkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const note = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null for update", [resourceId, ownerId]);
      const song = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='song' and deleted_at is null", [songId, ownerId]);
      if (!note.rowCount || !song.rowCount) return false;
      const linked = await client.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
        values($1,$2,$3,'rhyme_note') on conflict do nothing returning linked_resource_id`, [ownerId, songId, resourceId]);
      if (linked.rowCount) await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return linked.rowCount === 1;
    });
  }

  unlinkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => {
      const note = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null for update", [resourceId, ownerId]);
      if (!note.rowCount) return false;
      const unlinked = await client.query(`delete from song_resource_links
        where owner_id=$1 and song_resource_id=$2 and linked_resource_id=$3 and linked_resource_type='rhyme_note'`, [ownerId, songId, resourceId]);
      if (unlinked.rowCount) await client.query("update resources set updated_at=clock_timestamp() where id=$1 and owner_id=$2", [resourceId, ownerId]);
      return unlinked.rowCount === 1;
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  #updateResource(ownerId: string, resourceId: string, column: "is_favorite" | "color", value: boolean | ResourceColor | null): Promise<RhymeNoteRecord | null> {
    if (!isResourceId(resourceId)) return Promise.resolve(null);
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query(`update resources set ${column}=$3
        where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null returning id`, [resourceId, ownerId, value]);
      return result.rowCount ? selectRhyme(client, ownerId, resourceId) : null;
    });
  }

  async #withUser<T>(ownerId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!isResourceId(ownerId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [ownerId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function selectRhyme(client: PoolClient, ownerId: string, resourceId: string): Promise<RhymeNoteRecord | null> {
  const row = (await client.query<RhymeRow>(`${RHYME_SELECT} and r.owner_id=$1 and r.id=$2`, [ownerId, resourceId])).rows[0];
  if (!row) return null;
  const tags = await client.query<TagRow>(`select t.id,t.display_value,t.normalized_value,t.created_at,t.updated_at
    from resource_tags rt join tags t on t.id=rt.tag_id and t.owner_id=rt.owner_id
    where rt.owner_id=$1 and rt.resource_id=$2 and t.deleted_at is null order by t.normalized_value,t.id`, [ownerId, resourceId]);
  const songs = await client.query<{ song_resource_id: string }>(`select l.song_resource_id from song_resource_links l
    join resources song on song.id=l.song_resource_id and song.owner_id=l.owner_id and song.type='song' and song.deleted_at is null
    where l.owner_id=$1 and l.linked_resource_id=$2 and l.linked_resource_type='rhyme_note'
    order by l.created_at,l.song_resource_id`, [ownerId, resourceId]);
  return {
    id: row.id, title: row.title, body: row.body, isFavorite: row.is_favorite,
    isPinned: row.is_pinned, pinOrder: row.pin_order, color: row.color,
    rowVersion: Number(row.row_version), tags: tags.rows.map(mapTag),
    linkedSongIds: songs.rows.map((item) => item.song_resource_id),
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

async function lockRhyme(client: PoolClient, ownerId: string, resourceId: string): Promise<RhymeNoteRecord | null> {
  const locked = await client.query(`select r.id from resources r join rhyme_notes n on n.resource_id=r.id and n.owner_id=r.owner_id
    where r.id=$1 and r.owner_id=$2 and r.type='rhyme_note' and r.deleted_at is null for update of r`, [resourceId, ownerId]);
  return locked.rowCount ? selectRhyme(client, ownerId, resourceId) : null;
}

async function requestLock(client: PoolClient, ownerId: string, requestId: string): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`rhyme-create:${ownerId.toLowerCase()}:${requestId.toLowerCase()}`]);
}

async function replayRequest(client: PoolClient, ownerId: string, requestId: string, requestHash: string): Promise<CreatedRhymeNote | null> {
  const request = (await client.query<{ resource_id: string; request_sha256: string }>(
    "select resource_id,request_sha256 from rhyme_note_create_requests where owner_id=$1 and request_id=$2", [ownerId, requestId])).rows[0];
  if (!request) return null;
  if (request.request_sha256 !== requestHash) throw new RhymeConflictError("REQUEST_REUSED");
  const rhyme = await selectRhyme(client, ownerId, request.resource_id);
  if (!rhyme) throw new RhymeConflictError("REQUEST_REUSED");
  return { rhyme, replayed: true };
}

async function insertRhyme(client: PoolClient, ownerId: string, input: CreateRhymeNoteInput, operation: "create" | "duplicate", requestHash: string): Promise<CreatedRhymeNote> {
  const id = randomUUID();
  await client.query(`insert into resources(id,owner_id,type,title,is_favorite,is_pinned,pin_order,color)
    values($1,$2,'rhyme_note',$3,$4,$5,$6,$7)`, [id, ownerId, input.title, input.isFavorite, input.isPinned, input.pinOrder, input.color]);
  await client.query("insert into rhyme_notes(resource_id,owner_id,body) values($1,$2,$3)", [id, ownerId, input.body]);
  await client.query(`insert into rhyme_note_create_requests(owner_id,request_id,resource_id,operation,request_sha256)
    values($1,$2,$3,$4,$5)`, [ownerId, input.requestId, id, operation, requestHash]);
  const rhyme = await selectRhyme(client, ownerId, id);
  if (!rhyme) throw new Error("RHYME_CREATE_READBACK_FAILED");
  return { rhyme, replayed: false };
}

function hashRequest(operation: string, value: unknown): string {
  return createHash("sha256").update(`${operation}:${JSON.stringify(value)}`).digest("hex");
}

function mapTag(row: TagRow): RhymeTagRecord {
  return { id: row.id, displayValue: row.display_value, normalizedValue: row.normalized_value,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() };
}

function mapRhymeListItem(row: RhymeListRow): RhymeListItem {
  const tags = Array.isArray(row.tags) ? row.tags as RhymeTagRecord[] : [];
  const linkedSongs = Array.isArray(row.linked_songs) ? row.linked_songs as { id: string; title: string }[] : [];
  return {
    id: row.id, title: row.title, body: row.body, isFavorite: row.is_favorite, isPinned: row.is_pinned,
    pinOrder: row.pin_order, color: row.color, rowVersion: Number(row.row_version), tags,
    linkedSongIds: linkedSongs.map(({ id }) => id), linkedSongs,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  };
}

function rhymeSortOrder(sort: RhymeSort): string {
  const prefix = "case when r.is_pinned then 0 else 1 end,coalesce(r.pin_order,2147483647)";
  if (sort === "created_desc") return `${prefix},r.created_at desc,r.id desc`;
  if (sort === "created_asc") return `${prefix},r.created_at asc,r.id asc`;
  if (sort === "title_asc") return `${prefix},lower(r.title),r.id`;
  if (sort === "favorite_first") return `${prefix},case when r.is_favorite then 0 else 1 end,r.updated_at desc,r.id desc`;
  return `${prefix},r.updated_at desc,r.id desc`;
}

function rhymeQuerySignature(input: RhymeListInput): string {
  return createHash("sha256").update(JSON.stringify([input.search ?? "", input.tagId ?? "", input.songId ?? "", input.sort, input.limit])).digest("base64url").slice(0, 20);
}

function encodeRhymeCursor(cursor: RhymeCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeRhymeCursor(value: string, input: RhymeListInput): RhymeCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<RhymeCursor>;
    if (parsed.version !== 1 || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0
      || parsed.signature !== rhymeQuerySignature(input)) throw new RhymeCursorError();
    return parsed as RhymeCursor;
  } catch (error) {
    if (error instanceof RhymeCursorError) throw error;
    throw new RhymeCursorError();
  }
}
