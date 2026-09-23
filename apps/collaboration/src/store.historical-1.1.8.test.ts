import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { CollaborationStore } from "./store.js";

describe("historical projection retry scheduling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("continues past a full failing batch, reports failures, and wraps for another attempt", async () => {
    const failures = Array.from({ length: 20 }, (_, index) => ({ owner_id: "owner", document_key: `a-${String(index).padStart(2, "0")}` }));
    const later = { owner_id: "owner", document_key: "z-valid" };
    // Database boundary: pages returned for successive keyset scans. Real SQL
    // eligibility (including deleted rows) is covered by store.integration.test.
    const query = vi.spyOn(Pool.prototype, "query").mockImplementation((async (_sql: string, parameters: unknown[]) => {
      const cursor = parameters[1];
      const rows = cursor === failures.at(-1)!.document_key ? [later] : cursor === later.document_key ? [] : failures;
      return { rows, rowCount: rows.length };
    }) as typeof Pool.prototype.query);
    const store = new CollaborationStore("postgres://fixture.invalid/unused");
    const retry = vi.spyOn(store, "retryProjection").mockImplementation(async (_owner, key) => {
      if (key === later.document_key) return true;
      throw new Error("SYNC_PROMPT_INVALID");
    });
    try {
      expect(await store.retryPendingProjections()).toEqual({ attempted: 20, recovered: 0, failed: 20 });
      expect(await store.retryPendingProjections()).toEqual({ attempted: 1, recovered: 1, failed: 0 });
      expect(await store.retryPendingProjections()).toEqual({ attempted: 20, recovered: 0, failed: 20 });
      expect(retry).toHaveBeenCalledWith("owner", later.document_key);
      expect(query).toHaveBeenCalledTimes(4);
    } finally { await store.close(); }
  });

  it("propagates selection failures rather than reporting a successful empty batch", async () => {
    vi.spyOn(Pool.prototype, "query").mockRejectedValue(new Error("DATABASE_UNAVAILABLE") as never);
    const store = new CollaborationStore("postgres://fixture.invalid/unused");
    try { await expect(store.retryPendingProjections()).rejects.toThrow("DATABASE_UNAVAILABLE"); }
    finally { await store.close(); }
  });
});
