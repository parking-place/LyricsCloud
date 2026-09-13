import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  LOCAL_SYNC_QUEUE_LIMITS,
  compactQueuedUpdates,
  enqueueRemoteUpdate,
  type QueuedUpdate
} from "./sync-storage.js";

const documentKey = "11400000-0000-4000-8000-000000000001";
const grantId = "11400000-0000-4000-8000-000000000002";

describe("bounded collaboration queues", () => {
  it("losslessly compacts a same-capability durable outbox", () => {
    const source = new Y.Doc();
    const updates: QueuedUpdate[] = [];
    source.on("update", (payload: Uint8Array) => updates.push({
      updateId: `11400000-0000-4000-8000-${String(updates.length + 10).padStart(12, "0")}`,
      documentKey, payload, grantId, permissionEpoch: 3, writeEpoch: 7, authoredText: String(updates.length)
    }));
    for (let index = 0; index <= LOCAL_SYNC_QUEUE_LIMITS.count; index++) source.getText("body").insert(index, "한");
    const compacted = compactQueuedUpdates(updates, () => "11400000-0000-4000-8000-999999999999");
    expect(compacted).toHaveLength(1);
    expect(compacted[0]).toMatchObject({ documentKey, grantId, permissionEpoch: 3, writeEpoch: 7 });
    const restored = new Y.Doc();
    Y.applyUpdate(restored, compacted[0]!.payload);
    expect(restored.getText("body").toString()).toBe(source.getText("body").toString());
    expect(compacted[0]!.authoredText).toBe(updates.map((item) => item.authoredText).join(""));
    source.destroy(); restored.destroy();
  });

  it("bounds the IME remote buffer without changing the merged document", () => {
    const source = new Y.Doc();
    const buffered: Uint8Array[] = [];
    source.on("update", (update: Uint8Array) => enqueueRemoteUpdate(buffered, update));
    for (let index = 0; index < LOCAL_SYNC_QUEUE_LIMITS.count * 3; index++) source.getText("body").insert(index, "빛");
    expect(buffered.length).toBeLessThanOrEqual(LOCAL_SYNC_QUEUE_LIMITS.count);
    const restored = new Y.Doc();
    for (const update of buffered) Y.applyUpdate(restored, update);
    expect(restored.getText("body").toString()).toBe(source.getText("body").toString());
    source.destroy(); restored.destroy();
  });
});
