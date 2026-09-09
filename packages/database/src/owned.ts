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
  readonly accountStatus: "active";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProfileInput {
  readonly displayName: string;
  readonly avatarUrl: string | null;
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
    return this.#withUser(authenticatedUserId, async (db) => {
      const rows = await db.insert(userProfiles).values({
        ownerId: authenticatedUserId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl
      }).onConflictDoUpdate({
        target: userProfiles.ownerId,
        set: { displayName: input.displayName, avatarUrl: input.avatarUrl, updatedAt: new Date() }
      }).returning();
      return mapProfile(rows[0]!);
    });
  }

  updateProfile(authenticatedUserId: string, targetUserId: string, input: Partial<ProfileInput>): Promise<UserProfile | null> {
    return this.#withUser(authenticatedUserId, async (db) => {
      const changes = {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        updatedAt: new Date()
      };
      const rows = await db.update(userProfiles).set(changes)
        .where(eq(userProfiles.ownerId, targetUserId)).returning();
      return rows[0] ? mapProfile(rows[0]) : null;
    });
  }

  deleteProfile(authenticatedUserId: string, targetUserId: string): Promise<boolean> {
    return this.#withUser(authenticatedUserId, async (db) => {
      const rows = await db.delete(userProfiles).where(eq(userProfiles.ownerId, targetUserId))
        .returning({ ownerId: userProfiles.ownerId });
      return rows.length === 1;
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
}

function mapProfile(row: typeof userProfiles.$inferSelect): UserProfile {
  return {
    userId: row.ownerId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    accountStatus: "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}
