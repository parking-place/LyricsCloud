import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const RANDOM_LIMIT = 252;
const DEFAULT_TTL_HOURS = 24;
const MAX_ACTIVE_CODES = 100;
const MAX_GENERATION_ATTEMPTS = 64;

export type BetaEnvironment = "development" | "release" | "test";

export interface BetaCodeKeys {
  readonly indexKey: Buffer;
  readonly indexKid: string;
  readonly encryptionKey: Buffer;
}

export interface IssuedBetaCode {
  readonly code: string;
  readonly expiresAt: Date;
}

export interface ListedBetaCode extends IssuedBetaCode {
  readonly issuedAt: Date;
}

export interface RefreshBetaCodeResult {
  readonly environment: BetaEnvironment;
  readonly previousEpoch: number;
  readonly nextEpoch: number;
  readonly revokedCount: number;
  readonly cancelledIntentCount: number;
}

export async function issueBetaCodes(
  pool: Pool,
  input: {
    readonly environment: BetaEnvironment;
    readonly count: number;
    readonly keys: BetaCodeKeys;
    readonly now?: Date;
    readonly ttlHours?: number;
    readonly randomSource?: (size: number) => Buffer;
  }
): Promise<IssuedBetaCode[]> {
  assertCount(input.count);
  assertKeys(input.keys);
  const now = input.now ?? new Date();
  const ttlHours = input.ttlHours ?? DEFAULT_TTL_HOURS;
  if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 168) throw new Error("BETA_TTL_INVALID");
  const expiresAt = new Date(now.getTime() + ttlHours * 3_600_000);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockEnvironment(client, input.environment);
    const epoch = await currentEpoch(client, input.environment, now);
    await clearExpiredEnvelopes(client, input.environment, now);
    const active = await client.query<{ count: number }>(
      `select count(*)::int count from beta_codes
       where environment=$1 and consumed_at is null and revoked_at is null and expires_at>$2`,
      [input.environment, now]
    );
    if ((active.rows[0]?.count ?? 0) + input.count > MAX_ACTIVE_CODES) throw new Error("BETA_ACTIVE_LIMIT_EXCEEDED");

    const batchId = randomUUID();
    await client.query(
      `insert into beta_code_batches(id,environment,epoch,requested_count,issued_at,expires_at)
       values($1,$2,$3,$4,$5,$6)`,
      [batchId, input.environment, epoch, input.count, now, expiresAt]
    );

    const issued: IssuedBetaCode[] = [];
    const pendingDigests = new Set<string>();
    for (let index = 0; index < input.count; index += 1) {
      let inserted = false;
      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const code = generateBetaCode(input.randomSource ?? randomBytes);
        const digest = betaCodeDigest(code, input.environment, input.keys.indexKey);
        if (pendingDigests.has(digest)) continue;
        const historical = await client.query("select 1 from beta_codes where environment=$1 and code_digest=$2", [input.environment, digest]);
        if (historical.rowCount) continue;
        const envelope = sealBetaCode(code, input.environment, digest, input.keys.encryptionKey, input.randomSource ?? randomBytes);
        await client.query(
          `insert into beta_codes(batch_id,environment,epoch,code_digest,digest_kid,sealed_code,seal_nonce,seal_tag,issued_at,expires_at)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [batchId, input.environment, epoch, digest, input.keys.indexKid,
            envelope.ciphertext, envelope.nonce, envelope.tag, now, expiresAt]
        );
        pendingDigests.add(digest);
        issued.push({ code, expiresAt });
        inserted = true;
        break;
      }
      if (!inserted) throw new Error("BETA_CODE_COLLISION_LIMIT");
    }
    await client.query("commit");
    return issued;
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function listUnusedBetaCodes(
  pool: Pool,
  environment: BetaEnvironment,
  keys: BetaCodeKeys,
  now = new Date()
): Promise<ListedBetaCode[]> {
  assertKeys(keys);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockEnvironment(client, environment);
    await clearExpiredEnvelopes(client, environment, now);
    const result = await client.query<{
      code_digest: string;
      sealed_code: Buffer;
      seal_nonce: Buffer;
      seal_tag: Buffer;
      issued_at: Date;
      expires_at: Date;
    }>(
      `select code_digest,sealed_code,seal_nonce,seal_tag,issued_at,expires_at from beta_codes
       where environment=$1 and consumed_at is null and revoked_at is null and expires_at>$2
       order by issued_at,id`,
      [environment, now]
    );
    const listed = result.rows.map((row) => ({
      code: openBetaCode(row, environment, keys.encryptionKey),
      issuedAt: row.issued_at,
      expiresAt: row.expires_at
    }));
    await client.query("commit");
    return listed;
  } catch (error) {
    await rollback(client);
    throw safeDecryptError(error);
  } finally {
    client.release();
  }
}

export async function refreshUnusedBetaCodes(
  pool: Pool,
  environment: BetaEnvironment,
  now = new Date()
): Promise<RefreshBetaCodeResult> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockEnvironment(client, environment);
    const previousEpoch = await currentEpoch(client, environment, now);
    const cancelled = await client.query(
      `update beta_signup_intents i set cancelled_at=$2
       where i.environment=$1 and i.completed_at is null and i.cancelled_at is null
         and exists(select 1 from beta_codes c where c.id=i.code_id
           and c.environment=$1 and c.consumed_at is null and c.revoked_at is null)
       returning intent_digest`,
      [environment, now]
    );
    const revoked = await client.query(
      `update beta_codes set revoked_at=$2,sealed_code=null,seal_nonce=null,seal_tag=null
       where environment=$1 and consumed_at is null and revoked_at is null
       returning id`,
      [environment, now]
    );
    const nextEpoch = previousEpoch + 1;
    await client.query(
      `update beta_code_epochs set epoch=$2,refreshed_at=$3,updated_at=$3 where environment=$1`,
      [environment, nextEpoch, now]
    );
    await client.query(
      `insert into beta_code_refreshes(environment,previous_epoch,next_epoch,revoked_count,cancelled_intent_count,refreshed_at)
       values($1,$2,$3,$4,$5,$6)`,
      [environment, previousEpoch, nextEpoch, revoked.rowCount ?? 0, cancelled.rowCount ?? 0, now]
    );
    await client.query("commit");
    return { environment, previousEpoch, nextEpoch, revokedCount: revoked.rowCount ?? 0,
      cancelledIntentCount: cancelled.rowCount ?? 0 };
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export function normalizeBetaCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/u.test(normalized)) throw new Error("BETA_CODE_INVALID");
  return normalized;
}

export function betaCodeDigest(code: string, environment: BetaEnvironment, key: Buffer): string {
  if (key.length !== 32) throw new Error("BETA_INDEX_KEY_INVALID");
  return createHmac("sha256", key)
    .update(`lyricscloud|beta-code-index|v1|${environment}|${normalizeBetaCode(code)}`, "utf8")
    .digest("hex");
}

export function generateBetaCode(randomSource: (size: number) => Buffer = randomBytes): string {
  let result = "";
  for (let round = 0; round < 32 && result.length < 6; round += 1) {
    const bytes = randomSource(12);
    if (!Buffer.isBuffer(bytes) || bytes.length !== 12) throw new Error("BETA_RANDOM_SOURCE_INVALID");
    for (const value of bytes) {
      if (value >= RANDOM_LIMIT) continue;
      result += ALPHABET[value % ALPHABET.length];
      if (result.length === 6) return result;
    }
  }
  throw new Error("BETA_RANDOM_SOURCE_INVALID");
}

function sealBetaCode(code: string, environment: BetaEnvironment, digest: string, key: Buffer,
  randomSource: (size: number) => Buffer): { ciphertext: Buffer; nonce: Buffer; tag: Buffer } {
  const nonce = randomSource(12);
  if (nonce.length !== 12) throw new Error("BETA_RANDOM_SOURCE_INVALID");
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(`lyricscloud|beta-code-seal|v1|${environment}|${digest}`, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}

function openBetaCode(row: { code_digest: string; sealed_code: Buffer; seal_nonce: Buffer; seal_tag: Buffer },
  environment: BetaEnvironment, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, row.seal_nonce);
  decipher.setAAD(Buffer.from(`lyricscloud|beta-code-seal|v1|${environment}|${row.code_digest}`, "utf8"));
  decipher.setAuthTag(row.seal_tag);
  return normalizeBetaCode(Buffer.concat([decipher.update(row.sealed_code), decipher.final()]).toString("utf8"));
}

function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < 1 || count > MAX_ACTIVE_CODES) throw new Error("BETA_COUNT_INVALID");
}

function assertKeys(keys: BetaCodeKeys): void {
  if (keys.indexKey.length !== 32) throw new Error("BETA_INDEX_KEY_INVALID");
  if (keys.encryptionKey.length !== 32) throw new Error("BETA_AEAD_KEY_INVALID");
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(keys.indexKid)) throw new Error("BETA_INDEX_KID_INVALID");
}

async function currentEpoch(client: PoolClient, environment: BetaEnvironment, now: Date): Promise<number> {
  await client.query(
    `insert into beta_code_epochs(environment,epoch,updated_at) values($1,1,$2)
     on conflict(environment) do nothing`,
    [environment, now]
  );
  const result = await client.query<{ epoch: string }>("select epoch::text from beta_code_epochs where environment=$1 for update", [environment]);
  return Number(result.rows[0]!.epoch);
}

async function lockEnvironment(client: PoolClient, environment: BetaEnvironment): Promise<void> {
  await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`lyricscloud-beta-code:${environment}`]);
}

async function clearExpiredEnvelopes(client: PoolClient, environment: BetaEnvironment, now: Date): Promise<void> {
  await client.query(
    `update beta_codes set sealed_code=null,seal_nonce=null,seal_tag=null
     where environment=$1 and consumed_at is null and revoked_at is null and expires_at<=$2 and sealed_code is not null`,
    [environment, now]
  );
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("rollback").catch(() => undefined);
}

function safeDecryptError(error: unknown): unknown {
  if (error instanceof Error && (error.message.startsWith("BETA_") || !/auth|decrypt|unsupported state/iu.test(error.message))) return error;
  return new Error("BETA_CODE_DECRYPT_FAILED");
}
