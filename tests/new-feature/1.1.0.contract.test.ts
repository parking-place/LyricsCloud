import { describe, expect, it } from "vitest";
import { parseShareGrantInput, sharingResponseHeaders } from "../../apps/web/src/lib/sharing-api.js";

const sharingId = "10000000-0000-4000-8000-000000000001";
const requestId = "10000000-0000-4000-8000-000000000002";

describe("1.1.0 selected-read sharing contract", () => {
  it("accepts only an opaque recipient id, idempotency id and bounded expiry", () => {
    expect(parseShareGrantInput({ sharingId, requestId })).toEqual({ sharingId, requestId, expiresAt: null });
    expect(parseShareGrantInput({ sharingId, requestId, expiresAt: "2026-10-01T00:00:00.000Z" }))
      .toEqual({ sharingId, requestId, expiresAt: new Date("2026-10-01T00:00:00.000Z") });
    for (const value of [null, {}, { sharingId }, { sharingId, requestId: 3 },
      { sharingId, requestId, expiresAt: "not-a-date" }, { sharingId, requestId, ownerId: sharingId }]) {
      expect(() => parseShareGrantInput(value)).toThrow("SHARING_INPUT_INVALID");
    }
  });

  it("marks every sharing response private, uncached and unindexable", () => {
    expect(sharingResponseHeaders()).toMatchObject({
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    });
  });
});
