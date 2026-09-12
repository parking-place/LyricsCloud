import { describe, expect, it } from "vitest";
import { parseShareAccessInput } from "../../apps/web/src/lib/sharing-api.js";
import type { QueuedUpdate, RejectedWriterDraft } from "../../packages/editor/src/sync-storage.js";

const requestId = "11200000-0000-4000-8000-000000000001";

describe("1.1.2 selected write contract", () => {
  it("accepts only idempotent read/write access transitions", () => {
    expect(parseShareAccessInput({ requestId, access: "write" })).toEqual({ requestId, access: "write" });
    expect(parseShareAccessInput({ requestId, access: "read" })).toEqual({ requestId, access: "read" });
    for (const value of [null, {}, { requestId }, { access: "write" },
      { requestId, access: "owner" }, { requestId, access: "write", actorId: requestId }]) {
      expect(() => parseShareAccessInput(value)).toThrow("SHARING_INPUT_INVALID");
    }
  });

  it("keeps write capabilities bound to grant and both epochs", () => {
    const capability = { grantId: requestId, permissionEpoch: 3, writeEpoch: 7 };
    expect(capability).toEqual(expect.objectContaining({ grantId: requestId, permissionEpoch: 3, writeEpoch: 7 }));
    expect(capability.writeEpoch).toBeGreaterThan(capability.permissionEpoch);
  });

  it("separates rejected writer text from replayable CRDT payloads", () => {
    const queued: QueuedUpdate = { updateId: requestId, documentKey: requestId,
      payload: Uint8Array.of(1), grantId: requestId, permissionEpoch: 3, writeEpoch: 7, authoredText: "내가 쓴 문장" };
    const rejected: RejectedWriterDraft = { updateId: queued.updateId, resourceId: requestId,
      documentKey: queued.documentKey, grantId: queued.grantId!, permissionEpoch: queued.permissionEpoch!,
      writeEpoch: queued.writeEpoch!, authoredText: queued.authoredText!, reason: "write-revoked",
      rejectedAt: "2026-09-13T00:00:00.000Z" };
    expect(rejected.authoredText).toBe("내가 쓴 문장");
    expect(rejected).not.toHaveProperty("payload");
  });
});
