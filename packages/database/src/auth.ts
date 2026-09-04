import { Pool, type PoolClient } from "pg";

export interface AuthIdentityInput {
  readonly issuer: string;
  readonly subject: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly displayName?: string;
  readonly avatarUrl?: string;
}

export interface StoredSession {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly absoluteExpiresAt: Date;
}

export interface AuthStore {
  registerTransaction(stateHash: string, expiresAt: Date): Promise<void>;
  consumeTransaction(stateHash: string, now: Date): Promise<boolean>;
  upsertIdentity(identity: AuthIdentityInput, now: Date): Promise<string>;
  createSession(tokenHash: string, userId: string, expiresAt: Date, absoluteExpiresAt: Date, now: Date): Promise<void>;
  readSession(tokenHash: string, now: Date): Promise<StoredSession | null>;
  renewSession(tokenHash: string, expiresAt: Date, now: Date): Promise<boolean>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  close(): Promise<void>;
}

export class PostgresAuthStore implements AuthStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string) {
    this.#pool = new Pool({ connectionString: databaseUrl, max: 5, connectionTimeoutMillis: 2_000 });
  }

  async registerTransaction(stateHash: string, expiresAt: Date): Promise<void> {
    await this.#pool.query("delete from oauth_transactions where expires_at < now() - interval '1 hour'");
    await this.#pool.query(
      "insert into oauth_transactions(state_hash, expires_at) values ($1, $2)",
      [stateHash, expiresAt]
    );
  }

  async consumeTransaction(stateHash: string, now: Date): Promise<boolean> {
    const result = await this.#pool.query(
      `update oauth_transactions set consumed_at = $2
       where state_hash = $1 and consumed_at is null and expires_at > $2
       returning state_hash`,
      [stateHash, now]
    );
    return result.rowCount === 1;
  }

  async upsertIdentity(identity: AuthIdentityInput, now: Date): Promise<string> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [JSON.stringify([identity.issuer, identity.subject])]);
      const existing = await client.query<{ user_id: string }>(
        "select user_id from auth_identities where issuer = $1 and subject = $2",
        [identity.issuer, identity.subject]
      );
      let userId = existing.rows[0]?.user_id;
      if (userId) {
        await client.query(
          `update auth_identities
           set email = $3, email_verified = $4, display_name = $5, avatar_url = $6, last_login_at = $7
           where issuer = $1 and subject = $2`,
          [identity.issuer, identity.subject, identity.email, identity.emailVerified,
            identity.displayName ?? null, identity.avatarUrl ?? null, now]
        );
      } else {
        const created = await client.query<{ id: string }>("insert into app_users default values returning id");
        userId = created.rows[0]!.id;
        await client.query(
          `insert into auth_identities
           (issuer, subject, user_id, email, email_verified, display_name, avatar_url, last_login_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [identity.issuer, identity.subject, userId, identity.email, identity.emailVerified,
            identity.displayName ?? null, identity.avatarUrl ?? null, now]
        );
      }
      await client.query("update app_users set updated_at = $2 where id = $1", [userId, now]);
      await client.query("commit");
      return userId;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async createSession(tokenHash: string, userId: string, expiresAt: Date, absoluteExpiresAt: Date, now: Date): Promise<void> {
    await this.#pool.query(
      `insert into auth_sessions(token_hash, user_id, expires_at, absolute_expires_at, created_at, last_seen_at)
       values ($1, $2, $3, $4, $5, $5)`,
      [tokenHash, userId, expiresAt, absoluteExpiresAt, now]
    );
  }

  async readSession(tokenHash: string, now: Date): Promise<StoredSession | null> {
    const result = await this.#pool.query<{ user_id: string; expires_at: Date; absolute_expires_at: Date }>(
      `select s.user_id, s.expires_at, s.absolute_expires_at
       from auth_sessions s join app_users u on u.id = s.user_id
       where s.token_hash = $1 and s.revoked_at is null and s.expires_at > $2
         and s.absolute_expires_at > $2 and u.status = 'active'`,
      [tokenHash, now]
    );
    const row = result.rows[0];
    return row ? { userId: row.user_id, expiresAt: row.expires_at, absoluteExpiresAt: row.absolute_expires_at } : null;
  }

  async renewSession(tokenHash: string, expiresAt: Date, now: Date): Promise<boolean> {
    const result = await this.#pool.query(
      `update auth_sessions set expires_at = least($2, absolute_expires_at), last_seen_at = $3
       where token_hash = $1 and revoked_at is null and expires_at > $3 and absolute_expires_at > $3`,
      [tokenHash, expiresAt, now]
    );
    return result.rowCount === 1;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.#pool.query(
      "update auth_sessions set revoked_at = coalesce(revoked_at, $2) where token_hash = $1",
      [tokenHash, now]
    );
  }

  async close(): Promise<void> { await this.#pool.end(); }
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}
