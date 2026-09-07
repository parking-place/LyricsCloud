import type { Pool, PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";
import type { LyricRestoreStrategy, TrashItem, TrashReference, TrashTypeFilter } from "@lyricscloud/domain";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class LifecycleConflictError extends Error {
  constructor(readonly code: "TRASH_CHANGED" | "LYRIC_PARENT_ACTION_REQUIRED" | "DESTINATION_UNAVAILABLE" | "REAUTH_REQUIRED" | "WITHDRAWAL_UNAVAILABLE") {
    super(code);
    this.name = "LifecycleConflictError";
  }
}

export interface AccountLifecycleState {
  readonly userId: string;
  readonly status: "active" | "blocked" | "withdrawal_pending";
  readonly withdrawalRequestedAt: Date | null;
  readonly withdrawalPurgeAt: Date | null;
}

export interface PendingWithdrawalSession {
  readonly userId: string;
  readonly displayName: string;
  readonly purgeAt: Date;
}

export interface PurgeResult {
  readonly runId: string;
  readonly resourceCount: number;
  readonly templateCount: number;
  readonly accountCount: number;
}

interface TrashRow {
  kind: "resource" | "template";
  id: string;
  type: TrashItem["type"];
  title: string;
  original_location: string;
  parent_song_id: string | null;
  parent_deleted: boolean;
  deleted_at: Date;
  purge_at: Date;
  affected_lyrics: string;
  preserved_links: string;
}

export class PostgresLifecycleStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  async listTrash(ownerId: string, type: TrashTypeFilter = "all"): Promise<TrashItem[]> {
    return this.#withUser(ownerId, async (client) => {
      const result = await client.query<TrashRow>(TRASH_QUERY, [ownerId, type]);
      return result.rows.map(mapTrashRow);
    });
  }

  async restore(ownerId: string, references: readonly TrashReference[], strategy?: LyricRestoreStrategy, destinationSongId?: string): Promise<number> {
    return this.#withUser(ownerId, async (client) => {
      const rows = await lockTrashRows(client, ownerId, references);
      if (rows.length !== references.length) throw new LifecycleConflictError("TRASH_CHANGED");
      let restored = 0;
      for (const row of rows) {
        if (row.kind === "template") {
          restored += (await client.query("update templates set deleted_at=null where id=$1 and owner_id=$2 and deleted_at is not null", [row.id, ownerId])).rowCount ?? 0;
          continue;
        }
        if (row.type === "song") {
          restored += await restoreSong(client, ownerId, row.id);
          continue;
        }
        if (row.type === "lyrics") {
          const parent = await client.query<{ song_id: string; deleted_at: Date | null }>(`
            select l.song_id,parent.deleted_at from lyrics l join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
            where l.resource_id=$1 and l.owner_id=$2`, [row.id, ownerId]);
          const current = parent.rows[0];
          if (!current) throw new LifecycleConflictError("TRASH_CHANGED");
          if (current.deleted_at) {
            if (!strategy) throw new LifecycleConflictError("LYRIC_PARENT_ACTION_REQUIRED");
            if (strategy === "restore_parent") restored += await restoreSong(client, ownerId, current.song_id);
            else {
              if (!destinationSongId || !UUID.test(destinationSongId)) throw new LifecycleConflictError("DESTINATION_UNAVAILABLE");
              const destination = await client.query("select 1 from resources where id=$1 and owner_id=$2 and type='song' and deleted_at is null for update", [destinationSongId, ownerId]);
              if (!destination.rowCount) throw new LifecycleConflictError("DESTINATION_UNAVAILABLE");
              await client.query("update lyrics set song_id=$3 where resource_id=$1 and owner_id=$2", [row.id, ownerId, destinationSongId]);
            }
          }
        }
        restored += (await client.query(`update resources set deleted_at=null,deletion_batch_id=null
          where id=$1 and owner_id=$2 and deleted_at is not null`, [row.id, ownerId])).rowCount ?? 0;
      }
      return restored;
    });
  }

  async permanentlyDelete(ownerId: string, references: readonly TrashReference[], confirmations: readonly { kind: string; id: string; title: string }[]): Promise<number> {
    return this.#withUser(ownerId, async (client) => {
      const rows = await lockTrashRows(client, ownerId, references);
      if (rows.length !== references.length || !confirmationsMatch(rows, confirmations)) throw new LifecycleConflictError("TRASH_CHANGED");
      const selectedSongs = new Set(rows.filter((row) => row.kind === "resource" && row.type === "song").map((row) => row.id));
      let deleted = 0;
      for (const row of rows) {
        if (row.kind === "resource" && row.type === "lyrics" && row.parent_song_id && selectedSongs.has(row.parent_song_id)) continue;
        if (row.kind === "template") {
          const result = await client.query<{ changed: boolean }>("select hard_delete_trashed_template($1) changed", [row.id]);
          deleted += result.rows[0]?.changed ? 1 : 0;
          continue;
        }
        const result = await client.query<{ changed: boolean }>("select hard_delete_trashed_resource($1) changed", [row.id]);
        deleted += result.rows[0]?.changed ? 1 : 0;
      }
      return deleted;
    });
  }

  async getAccountLifecycle(userId: string): Promise<AccountLifecycleState | null> {
    if (!UUID.test(userId)) return null;
    const result = await this.#pool.query<{ id: string; status: AccountLifecycleState["status"]; withdrawal_requested_at: Date | null; withdrawal_purge_at: Date | null }>(`
      select id,status,withdrawal_requested_at,withdrawal_purge_at from app_users where id=$1`, [userId]);
    const row = result.rows[0];
    return row ? { userId: row.id, status: row.status, withdrawalRequestedAt: row.withdrawal_requested_at, withdrawalPurgeAt: row.withdrawal_purge_at } : null;
  }

  async requestWithdrawal(userId: string, tokenHash: string, now = new Date()): Promise<Date> {
    if (!UUID.test(userId) || !tokenHash) throw new LifecycleConflictError("REAUTH_REQUIRED");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      const recent = await client.query(`select 1 from auth_sessions where token_hash=$1 and user_id=$2 and revoked_at is null
        and expires_at>$3 and absolute_expires_at>$3 and created_at>=$3-interval '10 minutes' for update`, [tokenHash, userId, now]);
      if (!recent.rowCount) throw new LifecycleConflictError("REAUTH_REQUIRED");
      const requestedAt = now;
      const purgeAt = new Date(now.getTime() + 7 * 86_400_000);
      const changed = await client.query(`update app_users set status='withdrawal_pending',withdrawal_requested_at=$2,withdrawal_purge_at=$3,updated_at=$2
        where id=$1 and status='active' returning id`, [userId, requestedAt, purgeAt]);
      if (!changed.rowCount) throw new LifecycleConflictError("WITHDRAWAL_UNAVAILABLE");
      await client.query("update auth_sessions set revoked_at=$2 where user_id=$1 and revoked_at is null", [userId, now]);
      await client.query("commit");
      return purgeAt;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async resolvePendingWithdrawalSession(tokenHash: string, now = new Date()): Promise<PendingWithdrawalSession | null> {
    if (!tokenHash) return null;
    const result = await this.#pool.query<{ user_id: string; display_name: string; withdrawal_purge_at: Date }>(`
      select s.user_id,coalesce(p.display_name,'') display_name,u.withdrawal_purge_at
      from auth_sessions s join app_users u on u.id=s.user_id left join user_profiles p on p.owner_id=u.id
      where s.token_hash=$1 and s.revoked_at is null and s.expires_at>$2 and s.absolute_expires_at>$2
        and u.status='withdrawal_pending' and u.withdrawal_purge_at>$2`, [tokenHash, now]);
    const row = result.rows[0];
    return row ? { userId: row.user_id, displayName: row.display_name || "사용자", purgeAt: row.withdrawal_purge_at } : null;
  }

  async cancelWithdrawal(userId: string, tokenHash: string, now = new Date()): Promise<boolean> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      const pending = await client.query(`select 1 from auth_sessions s join app_users u on u.id=s.user_id
        where s.token_hash=$1 and s.user_id=$2 and s.revoked_at is null and s.expires_at>$3 and s.absolute_expires_at>$3
          and u.status='withdrawal_pending' and u.withdrawal_purge_at>$3 for update of u`, [tokenHash, userId, now]);
      if (!pending.rowCount) { await client.query("rollback"); return false; }
      const changed = await client.query(`update app_users set status='active',withdrawal_requested_at=null,withdrawal_purge_at=null,updated_at=$2
        where id=$1 and status='withdrawal_pending' and withdrawal_purge_at>$2`, [userId, now]);
      await client.query("commit");
      return changed.rowCount === 1;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async runDuePurge(now = new Date(), batchSize = 100): Promise<PurgeResult> {
    const size = Math.max(1, Math.min(500, Math.floor(batchSize)));
    await this.#pool.query(`update lifecycle_purge_runs set status='failed',finished_at=$1,error_code='WORKER_INTERRUPTED'
      where status='running' and started_at<($1::timestamptz-interval '5 minutes')`, [now]);
    const run = await this.#pool.query<{ id: string }>("insert into lifecycle_purge_runs(status,started_at) values('running',$1) returning id::text", [now]);
    const runId = run.rows[0]!.id;
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock($1)", [741924]);
      const accounts = await client.query<{ id: string }>(`select id from app_users where status='withdrawal_pending' and withdrawal_purge_at<=$1
        order by withdrawal_purge_at,id for update skip locked limit $2`, [now, size]);
      let accountCount = 0;
      for (const account of accounts.rows) accountCount += (await client.query("delete from app_users where id=$1 and status='withdrawal_pending' and withdrawal_purge_at<=$2", [account.id, now])).rowCount ?? 0;

      const resources = await client.query<{ id: string; type: string }>(`select id,type from resources where purge_at<=$1
        order by purge_at,id for update skip locked limit $2`, [now, size]);
      let resourceCount = 0;
      for (const resource of resources.rows) {
        if (resource.type === "song") await client.query("delete from resources where id in (select resource_id from lyrics where song_id=$1)", [resource.id]);
        resourceCount += (await client.query("delete from resources where id=$1 and purge_at<=$2", [resource.id, now])).rowCount ?? 0;
      }
      const templates = await client.query<{ id: string }>(`select id from templates where purge_at<=$1
        order by purge_at,id for update skip locked limit $2`, [now, size]);
      let templateCount = 0;
      for (const template of templates.rows) templateCount += (await client.query("delete from templates where id=$1 and purge_at<=$2", [template.id, now])).rowCount ?? 0;
      await client.query("commit");
      await this.#pool.query(`update lifecycle_purge_runs set status='success',finished_at=$2,resource_count=$3,template_count=$4,account_count=$5
        where id=$1`, [runId, new Date(), resourceCount, templateCount, accountCount]);
      return { runId, resourceCount, templateCount, accountCount };
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      await this.#pool.query("update lifecycle_purge_runs set status='failed',finished_at=$2,error_code=$3 where id=$1", [runId, new Date(), safeErrorCode(error)]).catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(userId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!UUID.test(userId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [userId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

const TRASH_QUERY = `
select 'resource'::text kind,r.id,r.type,r.title,
  case when r.type='lyrics' then coalesce(parent.title,'삭제된 곡') else '독립 자료' end original_location,
  l.song_id parent_song_id,(parent.deleted_at is not null) parent_deleted,r.deleted_at,r.purge_at,
  case when r.type='song' then (select count(*) from lyrics child join resources cr on cr.id=child.resource_id
    where child.song_id=r.id and cr.deleted_at is not null and cr.deletion_batch_id=r.deletion_batch_id) else 0 end affected_lyrics,
  (select count(*) from song_resource_links link where link.song_resource_id=r.id or link.linked_resource_id=r.id) preserved_links
from resources r left join lyrics l on l.resource_id=r.id left join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
where r.owner_id=$1 and r.deleted_at is not null and ($2='all' or r.type=$2)
union all
select 'template'::text kind,t.id,'template'::text type,t.title,'템플릿'::text original_location,
  null::uuid parent_song_id,false parent_deleted,t.deleted_at,t.purge_at,0::bigint affected_lyrics,0::bigint preserved_links
from templates t where t.owner_id=$1 and t.deleted_at is not null and ($2 in ('all','template'))
order by deleted_at desc,id`;

async function lockTrashRows(client: PoolClient, ownerId: string, references: readonly TrashReference[]): Promise<TrashRow[]> {
  const rows: TrashRow[] = [];
  for (const reference of references) {
    const query = reference.kind === "resource"
      ? `select 'resource'::text kind,r.id,r.type,r.title,
          case when r.type='lyrics' then coalesce(parent.title,'삭제된 곡') else '독립 자료' end original_location,
          l.song_id parent_song_id,(parent.deleted_at is not null) parent_deleted,r.deleted_at,r.purge_at,
          case when r.type='song' then (select count(*) from lyrics child join resources cr on cr.id=child.resource_id where child.song_id=r.id and cr.deleted_at is not null and cr.deletion_batch_id=r.deletion_batch_id) else 0 end affected_lyrics,
          (select count(*) from song_resource_links link where link.song_resource_id=r.id or link.linked_resource_id=r.id) preserved_links
        from resources r left join lyrics l on l.resource_id=r.id left join resources parent on parent.id=l.song_id and parent.owner_id=l.owner_id
        where r.id=$1 and r.owner_id=$2 and r.deleted_at is not null for update of r`
      : `select 'template'::text kind,t.id,'template'::text type,t.title,'템플릿'::text original_location,
          null::uuid parent_song_id,false parent_deleted,t.deleted_at,t.purge_at,0::bigint affected_lyrics,0::bigint preserved_links
        from templates t where t.id=$1 and t.owner_id=$2 and t.deleted_at is not null for update of t`;
    const found = await client.query<TrashRow>(query, [reference.id, ownerId]);
    if (found.rows[0]) rows.push(found.rows[0]);
  }
  return rows;
}

async function restoreSong(client: PoolClient, ownerId: string, songId: string): Promise<number> {
  const target = await client.query<{ deletion_batch_id: string | null }>(`select deletion_batch_id from resources
    where id=$1 and owner_id=$2 and type='song' and deleted_at is not null for update`, [songId, ownerId]);
  const batch = target.rows[0]?.deletion_batch_id;
  if (!target.rowCount) return 0;
  const parent = await client.query("update resources set deleted_at=null,deletion_batch_id=null where id=$1 and owner_id=$2", [songId, ownerId]);
  if (batch) await client.query(`update resources r set deleted_at=null,deletion_batch_id=null from lyrics l
    where l.resource_id=r.id and l.owner_id=r.owner_id and l.song_id=$1 and r.owner_id=$2 and r.deletion_batch_id=$3 and r.deleted_at is not null`, [songId, ownerId, batch]);
  return parent.rowCount ?? 0;
}

function confirmationsMatch(rows: readonly TrashRow[], confirmations: readonly { kind: string; id: string; title: string }[]): boolean {
  const expected = new Map(rows.map((row) => [`${row.kind}:${row.id}`, row.title]));
  if (expected.size !== confirmations.length) return false;
  return confirmations.every((item) => expected.get(`${item.kind}:${item.id}`) === item.title);
}

function mapTrashRow(row: TrashRow): TrashItem {
  return {
    kind: row.kind, id: row.id, type: row.type, title: row.title, originalLocation: row.original_location,
    parentSongId: row.parent_song_id, parentDeleted: row.parent_deleted,
    deletedAt: row.deleted_at.toISOString(), purgeAt: row.purge_at.toISOString(),
    affectedLyrics: Number(row.affected_lyrics), preservedLinks: Number(row.preserved_links)
  };
}

function safeErrorCode(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "PURGE_FAILED";
  return /^[A-Z0-9_]{1,80}$/.test(code) ? code : "PURGE_FAILED";
}
