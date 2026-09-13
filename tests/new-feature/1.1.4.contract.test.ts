import { describe, expect, it } from "vitest";
import {
  LOCAL_SYNC_QUEUE_LIMITS,
  sameQueuedUpdateCapability,
  type QueuedUpdate
} from "../../packages/editor/src/sync-storage.js";

const documentKey = "11400000-0000-4000-8000-000000000001";
const grantId = "11400000-0000-4000-8000-000000000002";

describe("1.1.4 sharing stability contract", () => {
  it("defines finite local queue thresholds and isolates capability epochs", () => {
    expect(LOCAL_SYNC_QUEUE_LIMITS).toEqual({ count: 64, bytes: 1_048_576 });
    const first: QueuedUpdate = { updateId: documentKey, documentKey, payload: Uint8Array.of(1),
      grantId, permissionEpoch: 3, writeEpoch: 7, authoredText: "한" };
    expect(sameQueuedUpdateCapability(first, { ...first, updateId: grantId })).toBe(true);
    expect(sameQueuedUpdateCapability(first, { ...first, updateId: grantId, writeEpoch: 8 })).toBe(false);
  });
});
