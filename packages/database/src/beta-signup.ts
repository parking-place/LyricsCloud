import type { Pool, PoolClient } from "pg";
import { createDatabasePool } from "./pool.js";
import type { AuthIdentityInput } from "./auth.js";
import type { BetaEnvironment } from "./beta-access.js";

export interface BetaSignupIntentInput {
  readonly intentDigest: string;
  readonly environment: BetaEnvironment;
  readonly claimedCodeDigest: string;
  readonly emailDigest: string;
  readonly emailKid: string;
  readonly oauthStateHash: string;
  readonly expiresAt: Date;
  readonly now: Date;
}

export interface BetaAdmissionInput {
  readonly environment: BetaEnvironment;
  readonly identity: AuthIdentityInput;
  readonly bootstrapAllowed: boolean;
  readonly now: Date;
}

export interface BetaRedemptionInput {
  readonly intentDigest: string;
  readonly environment: BetaEnvironment;
  readonly identity: AuthIdentityInput;
  readonly verifiedEmailDigest: string;
  readonly principalDigest: string;
  readonly oauthStateHash: string;
  readonly now: Date;
}

export interface BetaRedemptionResult {
  readonly userId: string;
  readonly outcome: "redeemed" | "already_granted";
}

export interface BetaSignupStore {
  registerBetaSignupIntent(input: BetaSignupIntentInput): Promise<void>;
  cancelBetaSignupIntent(intentDigest: string, environment: BetaEnvironment, now: Date): Promise<void>;
  admitIdentity(input: BetaAdmissionInput): Promise<string | null>;
  redeemBetaSignup(input: BetaRedemptionInput): Promise<BetaRedemptionResult>;
  close(): Promise<void>;
}

export class PostgresBetaSignupStore implements BetaSignupStore {
  readonly #pool: Pool;

  constructor(databaseUrl: string) {
    this.#pool = createDatabasePool(databaseUrl, 5);
  }

  async registerBetaSignupIntent(input: BetaSignupIntentInput): Promise<void> {
    await this.#pool.query(
      `insert into beta_signup_intents
       (intent_digest,environment,code_id,code_epoch,claimed_code_digest,email_digest,email_kid,oauth_state_hash,expires_at,created_at)
       values($1,$2,null,null,$3,$4,$5,$6,$7,$8)`,
      [input.intentDigest, input.environment, input.claimedCodeDigest, input.emailDigest,
        input.emailKid, input.oauthStateHash, input.expiresAt, input.now]
    );
  }

  async cancelBetaSignupIntent(intentDigest: string, environment: BetaEnvironment, now: Date): Promise<void> {
    await this.#pool.query(
      `update beta_signup_intents set cancelled_at=$3
       where intent_digest=$1 and environment=$2 and completed_at is null and cancelled_at is null`,
      [intentDigest, environment, now]
    );
  }

  async admitIdentity(input: BetaAdmissionInput): Promise<string | null> {
    if (!input.identity.emailVerified) return null;
    const client = await this.#pool.connect();
    let committed = false;
    try {
      await client.query("begin");
      await lockPrincipal(client, input.environment, input.identity.issuer, input.identity.subject);
      const existing = await findIdentity(client, input.identity.issuer, input.identity.subject);
      const grant = await findGrant(client, input.environment, input.identity.issuer, input.identity.subject);
      if (grant?.state === "revoked" || existing?.status === "blocked"
        || (!input.bootstrapAllowed && grant?.state !== "active")) {
        await client.query("commit"); committed = true; return null;
      }
      const userId = await upsertIdentity(client, input.identity, input.now, existing?.user_id ?? grant?.user_id ?? null);
      if (grant?.state === "active" && grant.user_id !== userId) throw new Error("BETA_GRANT_IDENTITY_CONFLICT");
      if (!grant && input.bootstrapAllowed) {
        await client.query(
          `insert into admission_grants(environment,issuer,subject,user_id,source,state,granted_at,updated_at)
           values($1,$2,$3,$4,'bootstrap','active',$5,$5)`,
          [input.environment, input.identity.issuer, input.identity.subject, userId, input.now]
        );
      }
      await client.query("commit"); committed = true;
      return userId;
    } catch (error) {
      if (!committed) await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async redeemBetaSignup(input: BetaRedemptionInput): Promise<BetaRedemptionResult> {
    if (!input.identity.emailVerified) throw new Error("AUTH_NOT_ALLOWED");
    const client = await this.#pool.connect();
    let committed = false;
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`lyricscloud-beta-code:${input.environment}`]);
      await lockPrincipal(client, input.environment, input.identity.issuer, input.identity.subject);
      const intentResult = await client.query<{
        email_digest: string; claimed_code_digest: string; oauth_state_hash: string; expires_at: Date;
        completed_at: Date | null; cancelled_at: Date | null;
      }>(
        `select email_digest,claimed_code_digest,oauth_state_hash,expires_at,completed_at,cancelled_at
         from beta_signup_intents where intent_digest=$1 and environment=$2 for update`,
        [input.intentDigest, input.environment]
      );
      const intent = intentResult.rows[0];
      if (!intent || intent.completed_at || intent.cancelled_at || intent.expires_at <= input.now) {
        await client.query("rollback"); committed = true;
        throw new Error("BETA_SIGNUP_REJECTED");
      }
      if (intent.oauth_state_hash !== input.oauthStateHash) {
        await client.query("rollback"); committed = true;
        throw new Error("BETA_SIGNUP_REJECTED");
      }
      if (await failureBudgetExceeded(client, input.environment, input.principalDigest, input.now)) {
        await cancelAndRecordFailure(client, input);
        await client.query("commit"); committed = true;
        throw new Error("BETA_SIGNUP_RATE_LIMITED");
      }
      if (intent.email_digest !== input.verifiedEmailDigest) {
        await cancelAndRecordFailure(client, input);
        await client.query("commit"); committed = true;
        throw new Error("BETA_EMAIL_MISMATCH");
      }

      const existing = await findIdentity(client, input.identity.issuer, input.identity.subject);
      const grant = await findGrant(client, input.environment, input.identity.issuer, input.identity.subject);
      if (grant?.state === "revoked" || existing?.status === "blocked" || existing?.status === "withdrawal_pending") {
        await cancelAndRecordFailure(client, input);
        await client.query("commit"); committed = true;
        throw new Error("AUTH_NOT_ALLOWED");
      }
      if (grant?.state === "active") {
        const userId = await upsertIdentity(client, input.identity, input.now, existing?.user_id ?? grant.user_id);
        if (grant.user_id !== userId) throw new Error("BETA_GRANT_IDENTITY_CONFLICT");
        await client.query(
          `update beta_signup_intents set cancelled_at=$3
           where intent_digest=$1 and environment=$2 and completed_at is null and cancelled_at is null`,
          [input.intentDigest, input.environment, input.now]
        );
        await client.query("commit"); committed = true;
        return { userId, outcome: "already_granted" };
      }

      const codeResult = await client.query<{ id: string; epoch: string }>(
        `select c.id,c.epoch::text from beta_codes c join beta_code_epochs e on e.environment=c.environment
         where c.environment=$1 and c.code_digest=$2 and c.epoch=e.epoch
           and c.consumed_at is null and c.revoked_at is null and c.expires_at>$3
         for update of c`,
        [input.environment, intent.claimed_code_digest, input.now]
      );
      const code = codeResult.rows[0];
      if (!code) {
        await cancelAndRecordFailure(client, input);
        await client.query("commit"); committed = true;
        throw new Error("BETA_SIGNUP_REJECTED");
      }

      const userId = await upsertIdentity(client, input.identity, input.now, existing?.user_id ?? null);
      const grantResult = await client.query<{ id: string }>(
        `insert into admission_grants(environment,issuer,subject,user_id,source,state,granted_at,updated_at)
         values($1,$2,$3,$4,'beta_code','active',$5,$5) returning id`,
        [input.environment, input.identity.issuer, input.identity.subject, userId, input.now]
      );
      const consumed = await client.query(
        `update beta_codes set consumed_at=$3,sealed_code=null,seal_nonce=null,seal_tag=null
         where id=$1 and environment=$2 and consumed_at is null and revoked_at is null returning id`,
        [code.id, input.environment, input.now]
      );
      if (consumed.rowCount !== 1) throw new Error("BETA_SIGNUP_REJECTED");
      const completed = await client.query(
        `update beta_signup_intents set code_id=$3,code_epoch=$4,completed_at=$5
         where intent_digest=$1 and environment=$2 and completed_at is null and cancelled_at is null`,
        [input.intentDigest, input.environment, code.id, Number(code.epoch), input.now]
      );
      if (completed.rowCount !== 1) throw new Error("BETA_SIGNUP_REJECTED");
      await client.query(
        `insert into beta_redemptions(environment,intent_digest,code_id,grant_id,issuer,subject,redeemed_at)
         values($1,$2,$3,$4,$5,$6,$7)`,
        [input.environment, input.intentDigest, code.id, grantResult.rows[0]!.id,
          input.identity.issuer, input.identity.subject, input.now]
      );
      await client.query("commit"); committed = true;
      return { userId, outcome: "redeemed" };
    } catch (error) {
      if (!committed) await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> { await this.#pool.end(); }
}

async function findIdentity(client: PoolClient, issuer: string, subject: string): Promise<{
  user_id: string; status: "active" | "blocked" | "withdrawal_pending";
} | null> {
  const result = await client.query<{ user_id: string; status: "active" | "blocked" | "withdrawal_pending" }>(
    `select i.user_id,u.status from auth_identities i join app_users u on u.id=i.user_id
     where i.issuer=$1 and i.subject=$2 for update of i,u`, [issuer, subject]
  );
  return result.rows[0] ?? null;
}

async function findGrant(client: PoolClient, environment: BetaEnvironment, issuer: string, subject: string): Promise<{
  user_id: string | null; state: "active" | "revoked";
} | null> {
  const result = await client.query<{ user_id: string | null; state: "active" | "revoked" }>(
    `select user_id,state from admission_grants where environment=$1 and issuer=$2 and subject=$3 for update`,
    [environment, issuer, subject]
  );
  return result.rows[0] ?? null;
}

async function upsertIdentity(client: PoolClient, identity: AuthIdentityInput, now: Date, preferredUserId: string | null): Promise<string> {
  const existing = await client.query<{ user_id: string }>(
    "select user_id from auth_identities where issuer=$1 and subject=$2", [identity.issuer, identity.subject]
  );
  let userId = existing.rows[0]?.user_id ?? preferredUserId;
  if (!userId) userId = (await client.query<{ id: string }>("insert into app_users default values returning id")).rows[0]!.id;
  const account = await client.query<{ status: string }>("select status from app_users where id=$1 for update", [userId]);
  if (!account.rows[0] || account.rows[0].status === "blocked") throw new Error("AUTH_NOT_ALLOWED");
  await client.query(
    `insert into auth_identities(issuer,subject,user_id,email,email_verified,display_name,avatar_url,last_login_at)
     values($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict(issuer,subject) do update set email=excluded.email,email_verified=excluded.email_verified,
       display_name=excluded.display_name,avatar_url=excluded.avatar_url,last_login_at=excluded.last_login_at`,
    [identity.issuer, identity.subject, userId, identity.email, identity.emailVerified,
      identity.displayName ?? null, identity.avatarUrl ?? null, now]
  );
  await client.query("update app_users set updated_at=$2 where id=$1", [userId, now]);
  await client.query(
    `insert into user_profiles(owner_id,display_name,avatar_url,updated_at) values($1,$2,$3,$4)
     on conflict(owner_id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at`,
    [userId, identity.displayName ?? "", identity.avatarUrl ?? null, now]
  );
  return userId;
}

async function failureBudgetExceeded(client: PoolClient, environment: BetaEnvironment, principalDigest: string, now: Date): Promise<boolean> {
  const result = await client.query<{ scope: "principal" | "global"; failures: string }>(
    `select scope,sum(failure_count)::text failures from beta_signup_failure_budgets
     where environment=$1 and window_started_at>$2 and
       ((scope='principal' and principal_digest=$3) or (scope='global' and principal_digest=$4))
     group by scope`,
    [environment, new Date(now.getTime() - 24 * 60 * 60 * 1_000), principalDigest, "0".repeat(64)]
  );
  const totals = new Map(result.rows.map((row) => [row.scope, Number(row.failures)]));
  return (totals.get("principal") ?? 0) >= 5 || (totals.get("global") ?? 0) >= 1_000;
}

async function cancelAndRecordFailure(client: PoolClient, input: BetaRedemptionInput): Promise<void> {
  await client.query(
    `update beta_signup_intents set cancelled_at=$3
     where intent_digest=$1 and environment=$2 and completed_at is null and cancelled_at is null`,
    [input.intentDigest, input.environment, input.now]
  );
  const window = new Date(input.now);
  window.setUTCMinutes(0, 0, 0);
  for (const [scope, digest] of [["principal", input.principalDigest], ["global", "0".repeat(64)]] as const) {
    await client.query(
      `insert into beta_signup_failure_budgets(environment,scope,principal_digest,window_started_at,failure_count,updated_at)
       values($1,$2,$3,$4,1,$5)
       on conflict(environment,scope,principal_digest,window_started_at)
       do update set failure_count=beta_signup_failure_budgets.failure_count+1,updated_at=excluded.updated_at`,
      [input.environment, scope, digest, window, input.now]
    );
  }
}

async function lockPrincipal(client: PoolClient, environment: BetaEnvironment, issuer: string, subject: string): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [JSON.stringify([environment, issuer, subject])]);
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}
