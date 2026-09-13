import { describe, expect, it } from "vitest";
import { createGuestSessionToken, guestSessionTokenDigest, parseGuestSessionToken } from "../../packages/auth/src/public-share.js";
import { parsePublicGuestSessionInput, parsePublicLinkAccessInput } from "../../apps/web/src/lib/public-sharing-api.js";

const requestId = "11300000-0000-4000-8000-000000000001";
const linkToken = "A".repeat(43);

describe("1.1.3 public guest write contract", () => {
  it("requires the current owner risk confirmation for public write", () => {
    expect(parsePublicLinkAccessInput({ requestId, access: "write", confirmation: "public-guest-write-v1" }))
      .toEqual({ requestId, access: "write", confirmation: "public-guest-write-v1" });
    expect(parsePublicLinkAccessInput({ requestId, access: "read" }))
      .toEqual({ requestId, access: "read" });
    for (const value of [null, {}, { requestId, access: "write" },
      { requestId, access: "write", confirmation: "old" },
      { requestId, access: "public", confirmation: "public-guest-write-v1" },
      { requestId, access: "read", confirmation: "public-guest-write-v1" }]) {
      expect(() => parsePublicLinkAccessInput(value)).toThrow("PUBLIC_SHARING_INPUT_INVALID");
    }
  });

  it("keeps the opaque guest session separate from the public capability", () => {
    const session = createGuestSessionToken();
    expect(session).toHaveLength(43);
    expect(parseGuestSessionToken(session)).toBe(session);
    expect(guestSessionTokenDigest(session)).toMatch(/^[0-9a-f]{64}$/);
    expect(guestSessionTokenDigest(session)).not.toBe(guestSessionTokenDigest(linkToken));
    expect(parsePublicGuestSessionInput(JSON.stringify({ token: linkToken }))).toEqual({ token: linkToken });
    expect(() => parsePublicGuestSessionInput(JSON.stringify({ token: linkToken, actorId: requestId })))
      .toThrow("PUBLIC_SHARING_INPUT_INVALID");
  });

  it("binds guest updates to link, session and both epochs", () => {
    const tuple = { linkId: requestId, guestSessionId: requestId, permissionEpoch: 4, writeEpoch: 2 };
    expect(tuple).toEqual(expect.objectContaining({ permissionEpoch: 4, writeEpoch: 2 }));
    expect(Object.keys(tuple)).not.toContain("ownerId");
    expect(Object.keys(tuple)).not.toContain("actorId");
  });
});
