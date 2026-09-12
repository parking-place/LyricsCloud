import { createHash, randomUUID } from "node:crypto";
import { isResourceId, type LyricStatus } from "@lyricscloud/domain";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { createDatabasePool } from "./pool.js";

export interface PublicLinkFields {
  readonly ownerDisplayName: boolean;
  readonly status: boolean;
  readonly updatedAt: boolean;
}

export interface PublicLyricLink {
  readonly id: string;
  readonly resourceId: string;
  readonly state: "active" | "revoked";
  readonly permissionEpoch: number;
  readonly fields: PublicLinkFields;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly revokedAt: string | null;
  readonly rotatedAt: string | null;
}

export interface PublicLyricProjection {
  readonly linkId: string;
  readonly title: string;
  readonly body: string;
  readonly status?: LyricStatus;
  readonly updatedAt?: string;
  readonly ownerDisplayName?: string;
  readonly permissionEpoch: number;
  readonly expiresAt: string;
}

interface LinkRow extends QueryResultRow {
  id: string; resource_id: string; state: "active" | "revoked"; permission_epoch: string;
  show_owner_display_name: boolean; show_status: boolean; show_updated_at: boolean;
  expires_at: Date; created_at: Date; revoked_at: Date | null; rotated_at: Date | null;
}

export class PublicLinkInputError extends Error {
  readonly code = "PUBLIC_LINK_INPUT_INVALID" as const;
  constructor() { super("PUBLIC_LINK_INPUT_INVALID"); this.name = "PublicLinkInputError"; }
}

export class PublicLinkConflictError extends Error {
  readonly code = "PUBLIC_LINK_REQUEST_REUSED" as const;
  constructor() { super("PUBLIC_LINK_REQUEST_REUSED"); this.name = "PublicLinkConflictError"; }
}

export class PostgresPublicLyricSharingStore {
  readonly #pool: Pool;
  constructor(databaseUrl: string, maxConnections = 5) { this.#pool = createDatabasePool(databaseUrl, maxConnections); }

  list(ownerId: string, resourceId: string): Promise<PublicLyricLink[] | null> {
    validateUuid(resourceId);
    return this.#withActor(ownerId, async (client) => {
      if (!await ownsActiveLyric(client, resourceId)) return null;
      const rows = await client.query<LinkRow>(`select id,resource_id,state,permission_epoch::text,
        show_owner_display_name,show_status,show_updated_at,expires_at,created_at,revoked_at,rotated_at
        from lyric_public_read_links where owner_id=$1 and resource_id=$2 order by created_at desc,id desc`,
      [ownerId, resourceId]);
      return rows.rows.map(mapLink);
    });
  }

  issue(ownerId: string, resourceId: string, input: {
    requestId: string; tokenDigest: string; expiresAt: Date; fields: PublicLinkFields;
  }): Promise<{ link: PublicLyricLink; replayed: boolean } | null> {
    validateUuid(resourceId); validateUuid(input.requestId); validateDigest(input.tokenDigest);
    if (!Number.isFinite(input.expiresAt.getTime()) || input.expiresAt.getTime() <= Date.now()
      || input.expiresAt.getTime() > Date.now() + 31 * 86_400_000) throw new PublicLinkInputError();
    const requestHash = createHash("sha256").update(JSON.stringify({ resourceId, expiresAt: input.expiresAt.toISOString(),
      fields: input.fields })).digest("hex");
    return this.#withActor(ownerId, async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`public-link-request:${ownerId}:${input.requestId}`]);
      const replay = (await client.query<{ link_id: string; request_sha256: string }>(
        "select link_id,request_sha256 from lyric_public_link_requests where owner_id=$1 and request_id=$2",
        [ownerId, input.requestId])).rows[0];
      if (replay) {
        if (replay.request_sha256 !== requestHash) throw new PublicLinkConflictError();
        const link = await selectLink(client, replay.link_id);
        return link ? { link, replayed: true } : null;
      }
      if (!await ownsActiveLyric(client, resourceId)) return null;
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`public-link:${resourceId}`]);
      const previousEpoch = Number((await client.query<{ epoch: string }>(
        "select coalesce(max(permission_epoch),0)::text epoch from lyric_public_read_links where resource_id=$1",
        [resourceId])).rows[0]!.epoch);
      await client.query(`update lyric_public_read_links set state='revoked',permission_epoch=permission_epoch+1,
        revoked_at=clock_timestamp(),rotated_at=clock_timestamp()
        where resource_id=$1 and owner_id=$2 and state='active'`, [resourceId, ownerId]);
      const id = randomUUID();
      await client.query(`insert into lyric_public_read_links(id,resource_id,owner_id,token_digest,permission_epoch,
        show_owner_display_name,show_status,show_updated_at,expires_at)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, resourceId, ownerId, input.tokenDigest, previousEpoch + 1,
        input.fields.ownerDisplayName, input.fields.status, input.fields.updatedAt, input.expiresAt]);
      await client.query(`insert into lyric_public_link_requests(owner_id,request_id,resource_id,link_id,request_sha256)
        values($1,$2,$3,$4,$5)`, [ownerId, input.requestId, resourceId, id, requestHash]);
      const link = await selectLink(client, id);
      if (!link) throw new Error("PUBLIC_LINK_READBACK_FAILED");
      return { link, replayed: false };
    });
  }

  revoke(ownerId: string, resourceId: string, linkId: string): Promise<boolean | null> {
    validateUuid(resourceId); validateUuid(linkId);
    return this.#withActor(ownerId, async (client) => {
      if (!await ownsActiveLyric(client, resourceId)) return null;
      const result = await client.query(`update lyric_public_read_links
        set state='revoked',permission_epoch=permission_epoch+1,revoked_at=clock_timestamp()
        where id=$1 and resource_id=$2 and owner_id=$3 and state='active'`, [linkId, resourceId, ownerId]);
      return result.rowCount === 1;
    });
  }

  async readProjection(tokenDigest: string): Promise<PublicLyricProjection | null> {
    validateDigest(tokenDigest);
    return this.#public(async (client) => {
      const row = (await client.query<{ link_id: string; document_key: string | null; title: string; body: string;
        status: LyricStatus | null; updated_at: Date | null; owner_display_name: string | null;
        permission_epoch: string; expires_at: Date }>("select * from app_public_lyric_projection($1)", [tokenDigest])).rows[0];
      if (!row) return null;
      return { linkId: row.link_id, title: row.title, body: row.body,
        ...(row.status ? { status: row.status } : {}), ...(row.updated_at ? { updatedAt: row.updated_at.toISOString() } : {}),
        ...(row.owner_display_name ? { ownerDisplayName: row.owner_display_name } : {}),
        permissionEpoch: Number(row.permission_epoch), expiresAt: row.expires_at.toISOString() };
    });
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withActor<T>(actorId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    validateUuid(actorId);
    return this.#transaction(async (client) => {
      await client.query("select set_config('app.user_id',$1,true)", [actorId]);
      return work(client);
    });
  }

  #public<T>(work: (client: PoolClient) => Promise<T>): Promise<T> { return this.#transaction(work); }

  async #transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin"); await client.query("set local role lyricscloud_app");
      const result = await work(client); await client.query("commit"); return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined); throw error;
    } finally { client.release(); }
  }
}

async function ownsActiveLyric(client: PoolClient, resourceId: string): Promise<boolean> {
  return (await client.query(`select 1 from resources where id=$1 and owner_id=app_current_user_id()
    and type='lyrics' and deleted_at is null`, [resourceId])).rowCount === 1;
}

async function selectLink(client: PoolClient, id: string): Promise<PublicLyricLink | null> {
  const row = (await client.query<LinkRow>(`select id,resource_id,state,permission_epoch::text,
    show_owner_display_name,show_status,show_updated_at,expires_at,created_at,revoked_at,rotated_at
    from lyric_public_read_links where id=$1`, [id])).rows[0];
  return row ? mapLink(row) : null;
}

function mapLink(row: LinkRow): PublicLyricLink {
  return { id: row.id, resourceId: row.resource_id, state: row.state, permissionEpoch: Number(row.permission_epoch),
    fields: { ownerDisplayName: row.show_owner_display_name, status: row.show_status, updatedAt: row.show_updated_at },
    expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null, rotatedAt: row.rotated_at?.toISOString() ?? null };
}

function validateUuid(value: string): void { if (!isResourceId(value)) throw new PublicLinkInputError(); }
function validateDigest(value: string): void { if (!/^[0-9a-f]{64}$/.test(value)) throw new PublicLinkInputError(); }
