import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { issueBetaCodes } from "./beta-access.js";
import { PostgresBetaSignupStore } from "./beta-signup.js";
import { createDatabasePool } from "./pool.js";

vi.mock("./pool.js", () => ({ createDatabasePool: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe("historical beta admission regressions without a database", () => {
  it("rejects a new index kid even when all historical codes lost their envelopes", async () => {
    const writes: string[] = [];
    const query = vi.fn(async (sql: string) => {
      if (/insert|update/i.test(sql)) writes.push(sql);
      if (sql.includes("digest_kid" ) && sql.includes("select")) return { rows: [{ digest_kid: "old" }], rowCount: 1 };
      if (sql.includes("select epoch")) return { rows: [{ epoch: "1" }], rowCount: 1 };
      if (sql.includes("count(*)")) return { rows: [{ count: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    const release = vi.fn();
    const pool = { connect: async () => ({ query, release }) } as unknown as Pool;
    await expect(issueBetaCodes(pool, { environment: "test", count: 1,
      keys: { indexKid: "new", indexKey: Buffer.alloc(32, 1), encryptionKey: Buffer.alloc(32, 2) },
      randomSource: (size) => Buffer.alloc(size), now: new Date("2026-09-01T00:00:00Z")
    })).rejects.toThrow("BETA_INDEX_KEY_CHANGE_UNSUPPORTED");
    expect(writes).toEqual([]);
    expect(query).toHaveBeenCalledWith("rollback");
    expect(release).toHaveBeenCalledOnce();
  });

  it.each(["intent", "code", "identity"] as const)("rejects expiry while waiting for the %s lock", async (waitingFor) => {
    const start = new Date("2026-09-01T00:00:00Z");
    const deadline = new Date(start.getTime() + 1000);
    let current = start;
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("from beta_signup_intents")) {
        if (waitingFor === "intent") current = deadline;
        return { rows: [{ email_digest: "email", claimed_code_digest: "code", oauth_state_hash: "state",
          expires_at: waitingFor === "code" ? new Date(start.getTime() + 600_000) : deadline,
          completed_at: null, cancelled_at: null }], rowCount: 1 };
      }
      if (sql.includes("from beta_codes c")) {
        if (waitingFor === "code") current = deadline;
        return { rows: [{ id: "code-id", epoch: "1", expires_at: deadline }], rowCount: 1 };
      }
      if (sql.includes("insert into app_users")) return { rows: [{ id: "user-id" }], rowCount: 1 };
      if (sql.includes("select status from app_users")) {
        if (waitingFor === "identity") current = deadline;
        return { rows: [{ status: "active" }], rowCount: 1 };
      }
      if (sql.includes("insert into admission_grants")) return { rows: [{ id: "grant-id" }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    vi.mocked(createDatabasePool).mockReturnValue({ connect: async () => ({ query, release: vi.fn() }) } as unknown as Pool);
    const store = new PostgresBetaSignupStore("postgresql://synthetic.invalid/never-connected");
    await expect(store.redeemBetaSignup({ environment: "test", intentDigest: "intent",
      identity: { issuer: "test", subject: "test", email: "synthetic@example.test", emailVerified: true },
      verifiedEmailDigest: "email", principalDigest: "principal", oauthStateHash: "state", now: start,
      currentTime: () => current
    })).rejects.toThrow("BETA_SIGNUP_REJECTED");
    expect(query.mock.calls.some(([sql]) => sql.includes("insert into admission_grants"))).toBe(false);
    expect(query.mock.calls.some(([sql]) => sql.includes("update beta_codes set consumed_at"))).toBe(false);
    expect(query).toHaveBeenCalledWith("rollback");
  });
});
