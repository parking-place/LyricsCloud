import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { betaCodeDigest, betaSignupEmailDigest, betaSignupPrincipalDigest,
  issueBetaCodes, refreshUnusedBetaCodes } from "./beta-access.js";
import { PostgresBetaSignupStore } from "./beta-signup.js";

const enabled = process.env.BETA_SIGNUP_DATABASE_INTEGRATION === "true";
const databaseUrl = process.env.DATABASE_URL ?? "";
const pool = enabled ? new Pool({ connectionString: databaseUrl, max: 5 }) : null;
const store = enabled ? new PostgresBetaSignupStore(databaseUrl) : null;
const indexKey = Buffer.alloc(32, 31);
const encryptionKey = Buffer.alloc(32, 47);
const keys = { indexKey, indexKid: "test-2026-09", encryptionKey };

describe.runIf(enabled)("PostgreSQL beta signup", () => {
  beforeEach(async () => {
    requireDisposable();
    await cleanup();
  });

  it("preserves tombstones and refuses a new index kid after refresh", async () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const randomSource = (size: number) => Buffer.alloc(size, 0);
    await issueBetaCodes(pool!, { environment: "test", count: 1, keys, now, randomSource });
    await refreshUnusedBetaCodes(pool!, "test", now);
    const tombstonesBefore = (await pool!.query("select * from beta_codes where environment='test' order by id")).rows;
    expect(tombstonesBefore).toHaveLength(1);
    expect(tombstonesBefore[0]).toMatchObject({
      digest_kid: keys.indexKid, revoked_at: now, sealed_code: null, seal_nonce: null, seal_tag: null
    });
    await expect(issueBetaCodes(pool!, { environment: "test", count: 1,
      keys: { ...keys, indexKid: "unsupported-next", indexKey: Buffer.alloc(32, 99) }, now, randomSource
    })).rejects.toThrow("BETA_INDEX_KEY_CHANGE_UNSUPPORTED");
    expect((await pool!.query("select * from beta_codes where environment='test' order by id")).rows)
      .toEqual(tombstonesBefore);
    await expect(issueBetaCodes(pool!, { environment: "test", count: 1, keys, now, randomSource }))
      .rejects.toThrow("BETA_CODE_COLLISION_LIMIT");
    expect((await pool!.query(`select
      (select count(*)::int from beta_codes) codes,
      (select count(*)::int from beta_code_batches) batches,
      (select count(*)::int from beta_codes where revoked_at is not null and sealed_code is null) tombstones`)).rows[0])
      .toEqual({ codes: 1, batches: 1, tombstones: 1 });
  });

  it.each(["intent", "code"] as const)("rejects %s expiry after an actual database lock wait", async (expires) => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    let current = now;
    const code = (await issueBetaCodes(pool!, { environment: "test", count: 1, keys, now }))[0]!.code;
    const identity = syntheticIdentity(`expired-${expires}`, `expired-${expires}@example.test`);
    const intentDigest = digest(`expired-${expires}`);
    await register(intentDigest, code, identity.email, now);
    if (expires === "code") await pool!.query("update beta_codes set expires_at=$1 where environment='test'",
      [new Date(now.getTime() + 1_000)]);
    const blocker = await pool!.connect();
    let attempt: Promise<unknown> | undefined;
    try {
      await blocker.query("begin");
      const pid = (await blocker.query("select pg_backend_pid() pid")).rows[0].pid;
      if (expires === "intent") {
        await blocker.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ["lyricscloud-beta-code:test"]);
      } else {
        await blocker.query("select id from beta_codes where environment='test' for update");
      }
      // Attach the rejection assertion before releasing the blocker.
      attempt = expect(store!.redeemBetaSignup({ ...redemption(intentDigest, identity, now),
        currentTime: () => current })).rejects.toThrow("BETA_SIGNUP_REJECTED");
      let waiting = false;
      for (let count = 0; count < 100; count += 1) {
        waiting = (await pool!.query(`select exists(select 1 from pg_stat_activity
          where datname=current_database() and $1::int=any(pg_blocking_pids(pid))) waiting`, [pid])).rows[0].waiting;
        if (waiting) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      current = new Date(now.getTime() + (expires === "intent" ? 600_000 : 1_000));
      await blocker.query("commit");
      await attempt;
      expect((await pool!.query(`select
        (select count(*)::int from beta_codes where consumed_at is not null) consumed,
        (select count(*)::int from admission_grants) grants,
        (select count(*)::int from beta_redemptions) receipts`)).rows[0]).toEqual({ consumed: 0, grants: 0, receipts: 0 });
    } finally {
      await blocker.query("rollback");
      blocker.release();
      await attempt;
    }
  });

  it("atomically consumes one code into one verified grant and recovers after a lost response", async () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    const code = (await issueBetaCodes(pool!, { environment: "test", count: 1, keys, now }))[0]!.code;
    const identity = syntheticIdentity("winner", "winner@example.test");
    const intentDigest = digest("intent-winner");
    await register(intentDigest, code, identity.email, now);

    await expect(store!.redeemBetaSignup({ ...redemption(intentDigest, identity, now), oauthStateHash: digest("wrong-state") }))
      .rejects.toThrow("BETA_SIGNUP_REJECTED");
    const result = await store!.redeemBetaSignup(redemption(intentDigest, identity, now));
    expect(result.outcome).toBe("redeemed");
    // Simulate a response/session-cookie loss: the user starts signup again with
    // the same consumed code and the same verified principal.
    const retryIntent = digest("intent-winner-retry");
    await register(retryIntent, code, identity.email, new Date(now.getTime() + 1_000));
    const retry = await store!.redeemBetaSignup(redemption(retryIntent, identity, new Date(now.getTime() + 1_000)));
    expect(retry).toEqual({ userId: result.userId, outcome: "already_granted" });
    const state = await pool!.query(`select
      (select count(*)::int from beta_codes where consumed_at is not null) consumed,
      (select count(*)::int from beta_redemptions) receipts,
      (select count(*)::int from admission_grants where state='active') grants,
      (select count(*)::int from beta_signup_intents where completed_at is not null) completed`);
    expect(state.rows[0]).toEqual({ consumed: 1, receipts: 1, grants: 1, completed: 1 });
    expect(await store!.admitIdentity({ environment: "test", identity, bootstrapAllowed: false,
      now: new Date(now.getTime() + 1_000) })).toBe(result.userId);
  });

  it("allows exactly one winner when two verified accounts redeem the same code", async () => {
    const now = new Date("2026-09-09T13:00:00.000Z");
    const code = (await issueBetaCodes(pool!, { environment: "test", count: 1, keys, now }))[0]!.code;
    const first = syntheticIdentity("race-a", "race-a@example.test");
    const second = syntheticIdentity("race-b", "race-b@example.test");
    const firstIntent = digest("race-intent-a");
    const secondIntent = digest("race-intent-b");
    await Promise.all([register(firstIntent, code, first.email, now), register(secondIntent, code, second.email, now)]);
    const attempts = await Promise.allSettled([
      store!.redeemBetaSignup(redemption(firstIntent, first, now)),
      store!.redeemBetaSignup(redemption(secondIntent, second, now))
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((item) => item.status === "rejected")).toHaveLength(1);
    expect((await pool!.query("select count(*)::int count from beta_redemptions")).rows[0].count).toBe(1);
    expect((await pool!.query("select count(*)::int count from admission_grants where state='active'")).rows[0].count).toBe(1);
  });

  it("keeps codes unused for wrong email, unverified identity, cancellation, refresh, and cross-environment claims", async () => {
    const now = new Date("2026-09-09T14:00:00.000Z");
    const issued = await issueBetaCodes(pool!, { environment: "test", count: 3, keys, now });
    const wrong = syntheticIdentity("wrong", "wrong@example.test");
    const wrongIntent = digest("wrong-intent");
    await register(wrongIntent, issued[0]!.code, "claimed@example.test", now);
    await expect(store!.redeemBetaSignup(redemption(wrongIntent, wrong, now))).rejects.toThrow("BETA_EMAIL_MISMATCH");

    const unverified = { ...syntheticIdentity("unverified", "unverified@example.test"), emailVerified: false };
    const unverifiedIntent = digest("unverified-intent");
    await register(unverifiedIntent, issued[1]!.code, unverified.email, now);
    await expect(store!.redeemBetaSignup(redemption(unverifiedIntent, unverified, now))).rejects.toThrow("AUTH_NOT_ALLOWED");
    await store!.cancelBetaSignupIntent(unverifiedIntent, "test", now);

    const refreshIntent = digest("refresh-intent");
    await register(refreshIntent, issued[2]!.code, "refresh@example.test", now);
    const refreshed = await refreshUnusedBetaCodes(pool!, "test", new Date(now.getTime() + 1_000));
    expect(refreshed.revokedCount).toBe(3);
    expect(refreshed.cancelledIntentCount).toBe(1);

    const releaseCode = (await issueBetaCodes(pool!, { environment: "release", count: 1, keys, now }))[0]!.code;
    const crossIdentity = syntheticIdentity("cross", "cross@example.test");
    const crossIntent = digest("cross-intent");
    await register(crossIntent, releaseCode, crossIdentity.email, now);
    await expect(store!.redeemBetaSignup(redemption(crossIntent, crossIdentity, now))).rejects.toThrow("BETA_SIGNUP_REJECTED");
    const counts = await pool!.query(`select
      (select count(*)::int from beta_redemptions) receipts,
      (select count(*)::int from admission_grants) grants,
      (select count(*)::int from beta_codes where environment='release' and consumed_at is null and revoked_at is null) release_unused`);
    expect(counts.rows[0]).toEqual({ receipts: 0, grants: 0, release_unused: 1 });
  });

  it("does not let bootstrap or code signup bypass blocked and revoked principals", async () => {
    const now = new Date("2026-09-09T15:00:00.000Z");
    const identity = syntheticIdentity("lifecycle", "lifecycle@example.test");
    const userId = await store!.admitIdentity({ environment: "test", identity, bootstrapAllowed: true, now });
    expect(userId).toBeTruthy();
    await pool!.query("update app_users set status='blocked' where id=$1", [userId]);
    expect(await store!.admitIdentity({ environment: "test", identity, bootstrapAllowed: true, now })).toBeNull();
    await pool!.query(`update admission_grants set state='revoked',revoked_at=$2,updated_at=$2 where user_id=$1`, [userId, now]);
    await pool!.query("update app_users set status='active' where id=$1", [userId]);
    expect(await store!.admitIdentity({ environment: "test", identity, bootstrapAllowed: true, now })).toBeNull();
  });

  it("updates provider defaults during allowed retry without replacing a user's profile override", async () => {
    const now = new Date("2026-09-09T16:00:00.000Z");
    const original = syntheticIdentity("profile-retry", "profile-retry@example.test");
    const userId = await store!.admitIdentity({ environment: "test", identity: original,
      bootstrapAllowed: true, now });
    expect(userId).toBeTruthy();
    await pool!.query(`update user_profiles set display_name='Custom Beta',
      display_name_override='Custom Beta',display_name_source='override' where owner_id=$1`, [userId]);
    const refreshed = { ...original, displayName: "New Google Name", avatarUrl: "https://example.test/provider.png" };
    expect(await store!.admitIdentity({ environment: "test", identity: refreshed,
      bootstrapAllowed: true, now: new Date(now.getTime() + 1_000) })).toBe(userId);
    expect((await pool!.query(`select display_name,provider_display_name,avatar_url,provider_avatar_url,
      display_name_source from user_profiles where owner_id=$1`, [userId])).rows[0]).toEqual({
      display_name: "Custom Beta", provider_display_name: "New Google Name",
      avatar_url: "https://example.test/provider.png", provider_avatar_url: "https://example.test/provider.png",
      display_name_source: "override" });
  });
});

afterAll(async () => {
  if (enabled) await cleanup();
  await store?.close();
  await pool?.end();
});

function requireDisposable() {
  if (!pool || !store || !/lyricscloud_test(?:\?|$)/u.test(databaseUrl)) {
    throw new Error("BETA_SIGNUP_DATABASE_INTEGRATION requires lyricscloud_test");
  }
}

async function register(intentDigest: string, code: string, email: string, now: Date) {
  await store!.registerBetaSignupIntent({ intentDigest, environment: "test",
    claimedCodeDigest: betaCodeDigest(code, "test", indexKey),
    emailDigest: betaSignupEmailDigest(email, "test", indexKey), emailKid: keys.indexKid,
    oauthStateHash: digest(`state-${intentDigest}`), expiresAt: new Date(now.getTime() + 600_000), now });
}

function redemption(intentDigest: string, identity: ReturnType<typeof syntheticIdentity>, now: Date) {
  return { intentDigest, environment: "test" as const, identity,
    verifiedEmailDigest: betaSignupEmailDigest(identity.email, "test", indexKey),
    principalDigest: betaSignupPrincipalDigest(identity.issuer, identity.subject, "test", indexKey),
    oauthStateHash: digest(`state-${intentDigest}`), now };
}

function syntheticIdentity(subject: string, email: string) {
  return { issuer: "https://accounts.google.com", subject: `synthetic-${subject}`, email, emailVerified: true,
    displayName: "Synthetic Beta User" };
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }

async function cleanup() {
  if (!pool) return;
  await pool.query(`delete from beta_redemptions; delete from beta_signup_intents;
    delete from admission_grants; delete from beta_signup_failure_budgets; delete from beta_code_refreshes;
    delete from beta_codes; delete from beta_code_batches; delete from beta_code_epochs;
    delete from app_users where exists(select 1 from auth_identities i where i.user_id=app_users.id and i.email like '%@example.test')`);
}
