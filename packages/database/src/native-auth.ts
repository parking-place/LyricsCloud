import { Pool, type PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";

export interface RegisterNativeTransactionInput {
  readonly transactionHash: string;
  readonly stateHash: string;
  readonly pkceChallenge: string;
  readonly redirectUriHash: string;
  readonly expiresAt: Date;
  readonly now: Date;
}

export interface AuthorizeNativeTransactionInput {
  readonly transactionHash: string;
  readonly userId: string;
  readonly codeHash: string;
  readonly codeExpiresAt: Date;
  readonly now: Date;
}

export interface ExchangeNativeTransactionInput {
  readonly transactionHash: string;
  readonly stateHash: string;
  readonly pkceChallenge: string;
  readonly redirectUriHash: string;
  readonly codeHash: string;
  readonly sessionTokenHash: string;
  readonly sessionExpiresAt: Date;
  readonly sessionAbsoluteExpiresAt: Date;
  readonly now: Date;
}

export interface NativeSessionRecord {
  readonly userId: string;
  readonly expiresAt: Date;
  readonly absoluteExpiresAt: Date;
}

export interface NativeAuthStore {
  registerNativeTransaction(input: RegisterNativeTransactionInput): Promise<void>;
  authorizeNativeTransaction(input: AuthorizeNativeTransactionInput): Promise<boolean>;
  exchangeNativeTransaction(input: ExchangeNativeTransactionInput): Promise<string | null>;
  readNativeSession(sessionTokenHash: string, now: Date): Promise<NativeSessionRecord | null>;
  renewNativeSession(sessionTokenHash: string, expiresAt: Date, now: Date): Promise<boolean>;
  revokeNativeSession(sessionTokenHash: string, now: Date): Promise<void>;
  close(): Promise<void>;
}

export class PostgresNativeAuthStore implements NativeAuthStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string, maxConnections = 5) {
    this.#pool = createDatabasePool(databaseUrl, maxConnections);
  }

  async registerNativeTransaction(input: RegisterNativeTransactionInput): Promise<void> {
    await this.#pool.query("delete from native_auth_transactions where expires_at < $1::timestamptz - interval '1 hour'", [input.now]);
    await this.#pool.query(`insert into native_auth_transactions
      (transaction_hash,state_hash,pkce_challenge,redirect_uri_hash,expires_at,created_at)
      values($1,$2,$3,$4,$5,$6)`, [input.transactionHash, input.stateHash, input.pkceChallenge,
      input.redirectUriHash, input.expiresAt, input.now]);
  }

  async authorizeNativeTransaction(input: AuthorizeNativeTransactionInput): Promise<boolean> {
    const result = await this.#pool.query(`update native_auth_transactions t
      set authorized_user_id=$2,code_hash=$3,code_expires_at=$4,authorized_at=$5
      where t.transaction_hash=$1 and t.expires_at>$5 and t.authorized_at is null and t.consumed_at is null
        and exists(select 1 from app_users u where u.id=$2 and u.status='active')
      returning t.transaction_hash`, [input.transactionHash, input.userId, input.codeHash, input.codeExpiresAt, input.now]);
    return result.rowCount === 1;
  }

  async exchangeNativeTransaction(input: ExchangeNativeTransactionInput): Promise<string | null> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      const row = (await client.query<{ user_id: string }>(`select t.authorized_user_id user_id
        from native_auth_transactions t join app_users u on u.id=t.authorized_user_id and u.status='active'
        where t.transaction_hash=$1 and t.state_hash=$2 and t.pkce_challenge=$3 and t.redirect_uri_hash=$4
          and t.code_hash=$5 and t.expires_at>$6 and t.code_expires_at>$6 and t.consumed_at is null
        for update of t`, [input.transactionHash, input.stateHash, input.pkceChallenge,
        input.redirectUriHash, input.codeHash, input.now])).rows[0];
      if (!row) {
        await client.query("rollback");
        return null;
      }
      await client.query(`insert into native_sessions
        (token_hash,user_id,scope,expires_at,absolute_expires_at,created_at,last_seen_at)
        values($1,$2,'read',$3,$4,$5,$5)`, [input.sessionTokenHash, row.user_id,
        input.sessionExpiresAt, input.sessionAbsoluteExpiresAt, input.now]);
      await client.query("update native_auth_transactions set consumed_at=$2 where transaction_hash=$1", [input.transactionHash, input.now]);
      await client.query("commit");
      return row.user_id;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally { client.release(); }
  }

  async readNativeSession(sessionTokenHash: string, now: Date): Promise<NativeSessionRecord | null> {
    const row = (await this.#pool.query<{ user_id: string; expires_at: Date; absolute_expires_at: Date }>(`select s.user_id,s.expires_at,s.absolute_expires_at
      from native_sessions s join app_users u on u.id=s.user_id
      where s.token_hash=$1 and s.scope='read' and s.revoked_at is null
        and s.expires_at>$2 and s.absolute_expires_at>$2 and u.status='active'`, [sessionTokenHash, now])).rows[0];
    return row ? { userId: row.user_id, expiresAt: row.expires_at, absoluteExpiresAt: row.absolute_expires_at } : null;
  }

  async renewNativeSession(sessionTokenHash: string, expiresAt: Date, now: Date): Promise<boolean> {
    const result = await this.#pool.query(`update native_sessions
      set expires_at=least($2,absolute_expires_at),last_seen_at=$3
      where token_hash=$1 and scope='read' and revoked_at is null and expires_at>$3 and absolute_expires_at>$3`,
    [sessionTokenHash, expiresAt, now]);
    return result.rowCount === 1;
  }

  async revokeNativeSession(sessionTokenHash: string, now: Date): Promise<void> {
    await this.#pool.query(`update native_sessions set revoked_at=$2
      where token_hash=$1 and revoked_at is null`, [sessionTokenHash, now]);
  }

  async close(): Promise<void> { await this.#pool.end(); }
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}
