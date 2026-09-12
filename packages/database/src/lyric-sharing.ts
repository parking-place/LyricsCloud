import { randomUUID } from "node:crypto";
import { isResourceId, type LyricStatus } from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

export interface SharingIdentity {
  readonly sharingId: string;
  readonly displayName: string;
}

export interface LyricReadGrant {
  readonly id: string;
  readonly sharingId: string;
  readonly displayName: string;
  readonly state: "active" | "revoked";
  readonly permissionEpoch: number;
  readonly createdAt: string;
  readonly revokedAt: string | null;
  readonly expiresAt: string | null;
}

export interface SharedLyricRecord {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly status: LyricStatus;
  readonly updatedAt: string;
  readonly ownerDisplayName: string;
  readonly access: { readonly mode: "read"; readonly permissionEpoch: number };
}

interface GrantRow extends QueryResultRow {
  id: string;
  sharing_id: string;
  display_name: string;
  state: "active" | "revoked";
  permission_epoch: string;
  created_at: Date;
  revoked_at: Date | null;
  expires_at: Date | null;
}

export class SharingInputError extends Error {
  readonly code = "SHARING_INPUT_INVALID" as const;
  constructor() { super("SHARING_INPUT_INVALID"); this.name = "SharingInputError"; }
}

export class SharingConflictError extends Error {
  readonly code = "SHARING_REQUEST_REUSED" as const;
  constructor() { super("SHARING_REQUEST_REUSED"); this.name = "SharingConflictError"; }
}

export class PostgresLyricSharingStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  getOwnIdentity(actorId: string): Promise<SharingIdentity | null> {
    return this.#withActor(actorId, async (client) => {
      const row = (await client.query<{ sharing_id: string; display_name: string }>(
        "select sharing_id,display_name from app_sharing_identity($1)", [actorId]
      )).rows[0];
      return row ? { sharingId: row.sharing_id, displayName: row.display_name } : null;
    });
  }

  listGrants(ownerId: string, resourceId: string): Promise<LyricReadGrant[] | null> {
    validateId(resourceId);
    return this.#withActor(ownerId, async (client) => {
      if (!await ownsActiveLyric(client, resourceId)) return null;
      const rows = await client.query<GrantRow>(`select g.id,i.sharing_id,i.display_name,g.state,
        g.permission_epoch::text,g.created_at,g.revoked_at,g.expires_at
        from lyric_read_grants g
        cross join lateral app_sharing_identity(g.grantee_id) i
        where g.resource_id=$1 and g.owner_id=$2
        order by g.created_at,g.id`, [resourceId, ownerId]);
      return rows.rows.map(mapGrant);
    });
  }

  grantRead(ownerId: string, resourceId: string, sharingId: string, requestId: string, expiresAt: Date | null = null): Promise<{ grant: LyricReadGrant; replayed: boolean } | null> {
    validateId(resourceId); validateId(sharingId); validateId(requestId);
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()
      || expiresAt.getTime() > Date.now() + 366 * 86_400_000)) throw new SharingInputError();
    return this.#withActor(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`lyric-share-request:${ownerId}:${requestId}`]);
      const grantee = (await client.query<{ user_id: string }>(
        "select app_resolve_active_sharing_id($1) user_id", [sharingId]
      )).rows[0]?.user_id;
      if (!grantee || grantee === ownerId || !await ownsActiveLyric(client, resourceId)) return null;

      const replay = (await client.query<{ resource_id: string; grantee_id: string; grant_id: string; requested_expires_at: Date | null }>(
        "select resource_id,grantee_id,grant_id,requested_expires_at from lyric_share_requests where owner_id=$1 and request_id=$2",
        [ownerId, requestId]
      )).rows[0];
      if (replay) {
        if (replay.resource_id !== resourceId || replay.grantee_id !== grantee
          || replay.requested_expires_at?.toISOString() !== expiresAt?.toISOString()) throw new SharingConflictError();
        const grant = await selectGrant(client, replay.grant_id);
        return grant ? { grant, replayed: true } : null;
      }

      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`lyric-share:${resourceId}:${grantee}`]);
      let grant = await selectActiveGrant(client, resourceId, grantee);
      if (grant && grant.expiresAt !== expiresAt?.toISOString() && !(grant.expiresAt === null && expiresAt === null)) {
        throw new SharingConflictError();
      }
      if (!grant) {
        const epoch = Number((await client.query<{ epoch: string }>(
          "select coalesce(max(permission_epoch),0)::text epoch from lyric_read_grants where resource_id=$1 and grantee_id=$2",
          [resourceId, grantee]
        )).rows[0]!.epoch) + 1;
        const id = randomUUID();
        await client.query(`insert into lyric_read_grants(id,resource_id,owner_id,grantee_id,permission_epoch,expires_at)
          values($1,$2,$3,$4,$5,$6)`, [id, resourceId, ownerId, grantee, epoch, expiresAt]);
        grant = await selectGrant(client, id);
      }
      if (!grant) throw new Error("SHARING_GRANT_READBACK_FAILED");
      await client.query(`insert into lyric_share_requests(owner_id,request_id,resource_id,grantee_id,grant_id,requested_expires_at)
        values($1,$2,$3,$4,$5,$6)`, [ownerId, requestId, resourceId, grantee, grant.id, expiresAt]);
      return { grant, replayed: false };
    });
  }

  revokeRead(ownerId: string, resourceId: string, grantId: string): Promise<boolean | null> {
    validateId(resourceId); validateId(grantId);
    return this.#withActor(ownerId, async (client) => {
      if (!await ownsActiveLyric(client, resourceId)) return null;
      const changed = await client.query(`update lyric_read_grants
        set state='revoked',permission_epoch=permission_epoch+1,revoked_at=clock_timestamp()
        where id=$1 and resource_id=$2 and owner_id=$3 and state='active'`, [grantId, resourceId, ownerId]);
      return changed.rowCount === 1;
    });
  }

  getSharedLyric(actorId: string, resourceId: string): Promise<SharedLyricRecord | null> {
    validateId(resourceId);
    return this.#withActor(actorId, async (client) => {
      const row = (await client.query<{ id: string; title: string; body: string; status: LyricStatus;
        updated_at: Date; display_name: string; permission_epoch: string }>(`select r.id,r.title,l.body,l.status,r.updated_at,
        owner_identity.display_name,g.permission_epoch::text
        from resources r join lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
        join lyric_read_grants g on g.resource_id=r.id and g.owner_id=r.owner_id and g.grantee_id=$1
          and g.state='active' and (g.expires_at is null or g.expires_at>statement_timestamp())
        cross join lateral app_sharing_identity(r.owner_id) owner_identity
        where r.id=$2 and r.type='lyrics' and r.deleted_at is null`, [actorId, resourceId])).rows[0];
      return row ? {
        id: row.id, title: row.title, body: row.body, status: row.status,
        updatedAt: row.updated_at.toISOString(), ownerDisplayName: publicDisplayName(row.display_name),
        access: { mode: "read", permissionEpoch: Number(row.permission_epoch) }
      } : null;
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withActor<T>(actorId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    validateId(actorId);
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [actorId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}

async function ownsActiveLyric(client: PoolClient, resourceId: string): Promise<boolean> {
  const result = await client.query("select 1 from resources where id=$1 and type='lyrics' and deleted_at is null", [resourceId]);
  return result.rowCount === 1;
}

async function selectGrant(client: PoolClient, grantId: string): Promise<LyricReadGrant | null> {
  const row = (await client.query<GrantRow>(`select g.id,i.sharing_id,i.display_name,g.state,
    g.permission_epoch::text,g.created_at,g.revoked_at,g.expires_at
    from lyric_read_grants g cross join lateral app_sharing_identity(g.grantee_id) i
    where g.id=$1`, [grantId])).rows[0];
  return row ? mapGrant(row) : null;
}

async function selectActiveGrant(client: PoolClient, resourceId: string, granteeId: string): Promise<LyricReadGrant | null> {
  const row = (await client.query<GrantRow>(`select g.id,i.sharing_id,i.display_name,g.state,
    g.permission_epoch::text,g.created_at,g.revoked_at,g.expires_at
    from lyric_read_grants g cross join lateral app_sharing_identity(g.grantee_id) i
    where g.resource_id=$1 and g.grantee_id=$2 and g.state='active'`, [resourceId, granteeId])).rows[0];
  return row ? mapGrant(row) : null;
}

function mapGrant(row: GrantRow): LyricReadGrant {
  return { id: row.id, sharingId: row.sharing_id, displayName: row.display_name, state: row.state,
    permissionEpoch: Number(row.permission_epoch), createdAt: row.created_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null, expiresAt: row.expires_at?.toISOString() ?? null };
}

function validateId(value: string): void {
  if (!isResourceId(value)) throw new SharingInputError();
}

function publicDisplayName(value: string): string {
  const name = value.trim().slice(0, 60);
  return !name || name.includes("@") || /^[0-9a-f-]{36}$/i.test(name) ? "공유자" : name;
}
