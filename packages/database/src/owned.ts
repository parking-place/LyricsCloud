import { eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";
import { userProfiles } from "./schema.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface UserProfile {
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly rowVersion: number;
  readonly displayNameSource: "legacy_unclassified" | "provider" | "override";
  readonly avatarSource: "legacy_unclassified" | "provider" | "override";
  readonly accountStatus: "active";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProfileInput {
  readonly displayName: string;
  readonly avatarUrl: string | null;
}

export interface ProfilePatchInput {
  readonly expectedRowVersion: number;
  readonly displayName?: string | null;
  readonly avatar?: null;
}

export type ProfilePatchResult =
  | { readonly state: "saved"; readonly profile: UserProfile }
  | { readonly state: "conflict"; readonly profile: UserProfile }
  | { readonly state: "missing" };

export interface CurrentAvatarPhoto {
  readonly bytes: Buffer;
  readonly sha256: string;
}

type ProfileDatabase = NodePgDatabase<{ userProfiles: typeof userProfiles }>;

export class PostgresOwnedDataStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  getProfile(authenticatedUserId: string, targetUserId = authenticatedUserId): Promise<UserProfile | null> {
    return this.#withUser(authenticatedUserId, async (db) => {
      const rows = await db.select().from(userProfiles).where(eq(userProfiles.ownerId, targetUserId)).limit(1);
      return rows[0] ? mapProfile(rows[0]) : null;
    });
  }

  saveProfile(authenticatedUserId: string, input: ProfileInput): Promise<UserProfile> {
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const prior = await client.query<{ avatar_photo_id: string | null }>(
        "select avatar_photo_id from user_profiles where owner_id=$1 for update", [authenticatedUserId]);
      const rows = await client.query<ProfileRow>(`
        insert into user_profiles(owner_id,display_name,avatar_url,display_name_override,
          display_name_source,avatar_source)
        values($1,$2,$3,$2,'override','legacy_unclassified')
        on conflict(owner_id) do update set
          display_name=excluded.display_name,avatar_url=excluded.avatar_url,
          display_name_override=excluded.display_name_override,display_name_source='override',
          avatar_source='legacy_unclassified',avatar_photo_id=null,
          row_version=user_profiles.row_version+1,updated_at=now()
        returning *`, [authenticatedUserId, input.displayName, input.avatarUrl]);
      if (prior.rows[0]?.avatar_photo_id)
        await client.query("delete from profile_avatar_photos where owner_id=$1 and id=$2",
          [authenticatedUserId, prior.rows[0].avatar_photo_id]);
      return mapSqlProfile(rows.rows[0]!);
    });
  }

  updateProfile(authenticatedUserId: string, targetUserId: string, input: Partial<ProfileInput>): Promise<UserProfile | null> {
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const prior = await client.query<ProfileRow>("select * from user_profiles where owner_id=$1 for update", [targetUserId]);
      if (!prior.rows[0]) return null;
      const hasName = input.displayName !== undefined;
      const hasAvatar = input.avatarUrl !== undefined;
      const rows = await client.query<ProfileRow>(`
        update user_profiles set
          display_name=case when $2::boolean then $3 else display_name end,
          display_name_override=case when $2::boolean then $3 else display_name_override end,
          display_name_source=case when $2::boolean then 'override' else display_name_source end,
          avatar_url=case when $4::boolean then $5 else avatar_url end,
          avatar_source=case when $4::boolean then 'legacy_unclassified' else avatar_source end,
          avatar_photo_id=case when $4::boolean then null else avatar_photo_id end,
          row_version=row_version+1,updated_at=now()
        where owner_id=$1 returning *`,
      [targetUserId, hasName, input.displayName ?? null, hasAvatar, input.avatarUrl ?? null]);
      if (hasAvatar && prior.rows[0].avatar_photo_id)
        await client.query("delete from profile_avatar_photos where owner_id=$1 and id=$2",
          [targetUserId, prior.rows[0].avatar_photo_id]);
      return mapSqlProfile(rows.rows[0]!);
    });
  }

  patchProfile(authenticatedUserId: string, input: ProfilePatchInput): Promise<ProfilePatchResult> {
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const locked = await client.query<ProfileRow>(
        "select * from user_profiles where owner_id=$1 for update", [authenticatedUserId]);
      const before = locked.rows[0];
      if (!before) return { state: "missing" };
      if (Number(before.row_version) !== input.expectedRowVersion)
        return { state: "conflict", profile: mapSqlProfile(before) };
      const name = input.displayName === undefined ? undefined
        : input.displayName === null ? providerName(before.provider_display_name) : input.displayName;
      const nameSource = input.displayName === undefined ? undefined
        : input.displayName === null ? "provider" : "override";
      const avatar = input.avatar === undefined ? undefined : before.provider_avatar_url;
      const updated = await client.query<ProfileRow>(`
        update user_profiles set
          display_name=coalesce($2,display_name),
          display_name_override=case when $3::text is null then display_name_override else $4::text end,
          display_name_source=coalesce($3,display_name_source),
          avatar_url=case when $5::boolean then $6 else avatar_url end,
          avatar_source=case when $5::boolean then 'provider' else avatar_source end,
          avatar_photo_id=case when $5::boolean then null else avatar_photo_id end,
          row_version=row_version+1,updated_at=now()
        where owner_id=$1 returning *`,
      [authenticatedUserId, name ?? null, nameSource ?? null,
        nameSource === "override" ? name : null, input.avatar === null, avatar ?? null]);
      if (input.avatar === null && before.avatar_photo_id)
        await client.query("delete from profile_avatar_photos where id=$1 and owner_id=$2", [before.avatar_photo_id, authenticatedUserId]);
      return { state: "saved", profile: mapSqlProfile(updated.rows[0]!) };
    });
  }

  replaceAvatarPhoto(authenticatedUserId: string, expectedRowVersion: number,
    bytes: Buffer, sha256: string): Promise<ProfilePatchResult> {
    if (!bytes.length || bytes.length > 204800 || !/^[0-9a-f]{64}$/.test(sha256))
      throw new Error("AVATAR_INVALID");
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const locked = await client.query<ProfileRow>(
        "select * from user_profiles where owner_id=$1 for update", [authenticatedUserId]);
      const before = locked.rows[0];
      if (!before) return { state: "missing" };
      if (Number(before.row_version) !== expectedRowVersion)
        return { state: "conflict", profile: mapSqlProfile(before) };
      const photo = await client.query<{ id: string }>(`
        insert into profile_avatar_photos(owner_id,webp_bytes,content_sha256)
        values($1,$2,$3) returning id`, [authenticatedUserId, bytes, sha256]);
      const updated = await client.query<ProfileRow>(`
        update user_profiles set avatar_photo_id=$2,avatar_url=null,avatar_source='override',
          row_version=row_version+1,updated_at=now() where owner_id=$1 returning *`,
        [authenticatedUserId, photo.rows[0]!.id]);
      if (before.avatar_photo_id)
        await client.query("delete from profile_avatar_photos where id=$1 and owner_id=$2", [before.avatar_photo_id, authenticatedUserId]);
      return { state: "saved", profile: mapSqlProfile(updated.rows[0]!) };
    });
  }

  getCurrentAvatarPhoto(authenticatedUserId: string): Promise<CurrentAvatarPhoto | null> {
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const result = await client.query<{ webp_bytes: Buffer; content_sha256: string }>(`
        select a.webp_bytes,a.content_sha256 from user_profiles p
        join profile_avatar_photos a on a.owner_id=p.owner_id and a.id=p.avatar_photo_id
        where p.owner_id=$1`, [authenticatedUserId]);
      const photo = result.rows[0];
      return photo ? { bytes: photo.webp_bytes, sha256: photo.content_sha256 } : null;
    });
  }

  deleteProfile(authenticatedUserId: string, targetUserId: string): Promise<boolean> {
    return this.#withUserClient(authenticatedUserId, async (client) => {
      const rows = await client.query("delete from user_profiles where owner_id=$1 returning owner_id", [targetUserId]);
      if (!rows.rowCount) return false;
      await client.query("delete from profile_avatar_photos where owner_id=$1", [targetUserId]);
      return true;
    });
  }

  async verifyContextCleared(): Promise<boolean> {
    const client = await this.#pool.connect();
    try {
      const result = await client.query<{ role: string; user_id: string | null }>(
        "select current_role as role, current_setting('app.user_id', true) as user_id"
      );
      return result.rows[0]?.role !== "lyricscloud_app" && !result.rows[0]?.user_id;
    } finally { client.release(); }
  }

  async close(): Promise<void> { await this.#pool.end(); }

  async #withUser<T>(authenticatedUserId: string, work: (db: ProfileDatabase) => Promise<T>): Promise<T> {
    if (!UUID.test(authenticatedUserId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id', $1, true)", [authenticatedUserId]);
      const result = await work(drizzle(client, { schema: { userProfiles } }));
      await client.query("commit");
      return result;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally { client.release(); }
  }

  async #withUserClient<T>(authenticatedUserId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!UUID.test(authenticatedUserId)) throw new Error("AUTH_CONTEXT_INVALID");
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("set local role lyricscloud_app");
      await client.query("select set_config('app.user_id',$1,true)", [authenticatedUserId]);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally { client.release(); }
  }
}

interface ProfileRow {
  owner_id: string; display_name: string; avatar_url: string | null;
  provider_display_name: string; provider_avatar_url: string | null;
  display_name_source: UserProfile["displayNameSource"];
  avatar_source: UserProfile["avatarSource"];
  avatar_photo_id: string | null; row_version: string;
  created_at: Date; updated_at: Date;
}

function providerName(value: string): string { return value.trim() || "사용자"; }

function mapSqlProfile(row: ProfileRow): UserProfile {
  return { userId: row.owner_id, displayName: row.display_name,
    avatarUrl: row.avatar_photo_id ? "/api/profile/avatar" : row.avatar_url,
    rowVersion: Number(row.row_version), displayNameSource: row.display_name_source,
    avatarSource: row.avatar_source, accountStatus: "active",
    createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapProfile(row: typeof userProfiles.$inferSelect): UserProfile {
  return {
    userId: row.ownerId,
    displayName: row.displayName,
    avatarUrl: row.avatarPhotoId ? "/api/profile/avatar" : row.avatarUrl,
    rowVersion: row.rowVersion,
    displayNameSource: row.displayNameSource as UserProfile["displayNameSource"],
    avatarSource: row.avatarSource as UserProfile["avatarSource"],
    accountStatus: "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}
