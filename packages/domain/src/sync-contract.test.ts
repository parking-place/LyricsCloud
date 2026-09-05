import { describe, expect, it } from "vitest";
import { authorizeSyncDocument, parseSyncUpdateEnvelope, SYNC_LIMITS } from "./sync-contract.js";

const base = {
  authenticatedOwnerId: "owner-a", resourceOwnerId: "owner-a", resourceId: "resource-a",
  documentKey: "opaque-document", sessionExpiresAt: new Date("2030-01-01T00:00:00Z"), deletedAt: null
};

describe("sync access contract", () => {
  it("allows only a live same-owner document and otherwise fails indistinguishably", () => {
    expect(authorizeSyncDocument(base, new Date("2029-01-01T00:00:00Z"))).toMatchObject({ allowed: true, documentKey: "opaque-document" });
    for (const candidate of [
      { ...base, authenticatedOwnerId: "owner-b" },
      { ...base, authenticatedOwnerId: null },
      { ...base, deletedAt: new Date("2028-01-01T00:00:00Z") },
      { ...base, sessionExpiresAt: new Date("2028-01-01T00:00:00Z") }
    ]) expect(authorizeSyncDocument(candidate, new Date("2029-01-01T00:00:00Z"))).toEqual({ allowed: false, code: "SYNC_DOCUMENT_UNAVAILABLE" });
  });

  it("accepts bounded uniquely identified binary updates", () => {
    const updateId = "00000000-0000-4000-8000-000000000031";
    expect(parseSyncUpdateEnvelope({ updateId, payload: new Uint8Array([1]) })).toMatchObject({ updateId });
    for (const value of [{ updateId: "resource-id", payload: new Uint8Array([1]) }, { updateId, payload: new Uint8Array() }, { updateId, payload: new Uint8Array(SYNC_LIMITS.updateBytes + 1) }]) {
      expect(() => parseSyncUpdateEnvelope(value)).toThrow("SYNC_UPDATE_INVALID");
    }
  });
});
