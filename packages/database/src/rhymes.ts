import { createHash, randomUUID } from "node:crypto";
import {
  isResourceId, normalizeRhymeTag, parseCreateRhymeNoteInput, parseRhymeRequestId,
  parseUpdateRhymeNoteInput, RHYME_LIMITS, RhymeConflictError,
  type CreateRhymeNoteInput, type RhymeNoteRecord, type RhymeTagRecord,
  type UpdateRhymeNoteInput
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
      await client.query("select id from resources where id=$1 and owner_id=$2 and type='rhyme_note' and deleted_at is null for update", [resourceId, ownerId]);
      const existing = await client.query("select 1 from resource_tags where owner_id=$1 and resource_id=$2 and tag_id=$3", [ownerId, resourceId, tagId]);
      if (existing.rowCount) return false;
      const count = Number((await client.query<{ count: string }>("select count(*)::text count from resource_tags where owner_id=$1 and resource_id=$2", [ownerId, resourceId])).rows[0]!.count);
      if (count >= RHYME_LIMITS.tagsPerNote) throw new Error("RHYME_TAG_LIMIT");
      const result = await client.query(`insert into resource_tags(owner_id,resource_id,tag_id) values($1,$2,$3)
        on conflict do nothing returning tag_id`, [ownerId, resourceId, tagId]);
      return result.rowCount === 1;
    });
  }

  detachTag(ownerId: string, resourceId: string, tagId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(tagId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => (await client.query(
      "delete from resource_tags where owner_id=$1 and resource_id=$2 and tag_id=$3", [ownerId, resourceId, tagId])).rowCount === 1);
  }

  linkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => (await client.query(`insert into song_resource_links(owner_id,song_resource_id,linked_resource_id,linked_resource_type)
      values($1,$2,$3,'rhyme_note') on conflict do nothing returning linked_resource_id`, [ownerId, songId, resourceId])).rowCount === 1);
  }

  unlinkSong(ownerId: string, resourceId: string, songId: string): Promise<boolean> {
    if (!isResourceId(resourceId) || !isResourceId(songId)) return Promise.resolve(false);
    return this.#withUser(ownerId, async (client) => (await client.query(`delete from song_resource_links
      where owner_id=$1 and song_resource_id=$2 and linked_resource_id=$3 and linked_resource_type='rhyme_note'`, [ownerId, songId, resourceId])).rowCount === 1);
  }

  async close(): Promise<void> { await this.#pool.end(); }

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
