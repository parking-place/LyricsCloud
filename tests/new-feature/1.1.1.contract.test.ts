import { describe, expect, it } from "vitest";
import { createPublicShareToken, parsePublicShareToken, publicShareTokenDigest } from "../../packages/auth/src/public-share.js";
import {
  parsePublicLinkInput,
  parsePublicReadInput,
  publicSharingResponseHeaders,
  withinPublicRateLimit
} from "../../apps/web/src/lib/public-sharing-api.js";

const requestId = "11100000-0000-4000-8000-000000000001";

describe("1.1.1 public-link read contract", () => {
  it("creates a canonical 256-bit token and stores only a stable domain-separated digest", () => {
    const first = createPublicShareToken();
    const second = createPublicShareToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(parsePublicShareToken(first)).toBe(first);
    expect(publicShareTokenDigest(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(publicShareTokenDigest(first)).toBe(publicShareTokenDigest(first));
    expect(publicShareTokenDigest(first)).not.toContain(first);
    for (const value of ["", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "=", "한글", null]) {
      expect(() => parsePublicShareToken(value)).toThrow("PUBLIC_SHARE_TOKEN_INVALID");
    }
  });

  it("accepts only bounded expiry presets and explicit public fields", () => {
    expect(parsePublicLinkInput({ requestId, expiresInDays: 7 })).toEqual({
      requestId,
      expiresInDays: 7,
      fields: { ownerDisplayName: false, status: false, updatedAt: false }
    });
    expect(parsePublicLinkInput({ requestId, expiresInDays: 30,
      fields: { ownerDisplayName: true, status: true, updatedAt: false } })).toEqual({
      requestId,
      expiresInDays: 30,
      fields: { ownerDisplayName: true, status: true, updatedAt: false }
    });
    for (const value of [null, {}, { requestId, expiresInDays: 2 },
      { requestId, expiresInDays: 7, fields: { body: false } },
      { requestId, expiresInDays: 7, ownerId: requestId }]) {
      expect(() => parsePublicLinkInput(value)).toThrow("PUBLIC_SHARING_INPUT_INVALID");
    }
  });

  it("reads tokens only from a fixed POST body and marks all results private and unindexable", () => {
    const token = createPublicShareToken();
    expect(parsePublicReadInput(JSON.stringify({ token }))).toEqual({ token });
    for (const value of ["", "{}", JSON.stringify({ token, lyricId: requestId }), "{" + "x".repeat(4096) + "}"]) {
      expect(() => parsePublicReadInput(value)).toThrow("PUBLIC_SHARING_INPUT_INVALID");
    }
    expect(publicSharingResponseHeaders).toMatchObject({
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer"
    });
  });

  it("uses bounded aggregate rate windows without retaining raw tokens", () => {
    const key = `link:${"a".repeat(64)}`;
    expect(withinPublicRateLimit(key, 2, 1_000)).toBe(true);
    expect(withinPublicRateLimit(key, 2, 1_001)).toBe(true);
    expect(withinPublicRateLimit(key, 2, 1_002)).toBe(false);
    expect(withinPublicRateLimit(key, 2, 61_000)).toBe(true);
  });
});
