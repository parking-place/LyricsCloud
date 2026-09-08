import { describe, expect, it } from "vitest";
import { apiBodyExceedsLimit, rateLimitResponse, requestClientKey, TokenBucketRateLimiter } from "./request-security.js";

describe("API request security limits", () => {
  it("rejects declared and streamed bodies above the byte limit", async () => {
    expect(await apiBodyExceedsLimit(new Request("http://localhost/api/test", {
      method: "POST", headers: { "Content-Length": "9" }, body: "123456789"
    }), 8)).toBe(true);
    expect(await apiBodyExceedsLimit(new Request("http://localhost/api/test", {
      method: "POST", body: "한글"
    }), 5)).toBe(true);
    expect(await apiBodyExceedsLimit(new Request("http://localhost/api/test", {
      method: "POST", body: "12345678"
    }), 8)).toBe(false);
  });

  it("refills rate-limit tokens and returns a bounded retry delay", () => {
    const limiter = new TokenBucketRateLimiter();
    expect(limiter.consume("login:one", 2, 10_000, 1_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.consume("login:one", 2, 10_000, 1_000)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.consume("login:one", 2, 10_000, 1_000)).toMatchObject({ allowed: false, retryAfterSeconds: 5 });
    expect(limiter.consume("login:one", 2, 10_000, 6_000)).toMatchObject({ allowed: true });
    expect(limiter.consume("login:other", 2, 10_000, 1_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("bounds high-cardinality client buckets by evicting the oldest keys", () => {
    const limiter = new TokenBucketRateLimiter();
    for (let index = 0; index <= 10_000; index += 1) limiter.consume(`client:${index}`, 2, 60_000, 1_000);
    expect(limiter.consume("client:0", 2, 60_000, 1_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("uses the trusted proxy address precedence without query or body data", () => {
    expect(requestClientKey(new Request("http://localhost", { headers: {
      "cf-connecting-ip": "203.0.113.9", "x-real-ip": "192.0.2.5", "x-forwarded-for": "198.51.100.2, 198.51.100.3"
    } }))).toBe("203.0.113.9");
    expect(requestClientKey(new Request("http://localhost", { headers: { "x-real-ip": "192.0.2.5" } }))).toBe("192.0.2.5");
    expect(requestClientKey(new Request("http://localhost", { headers: { "x-forwarded-for": "198.51.100.2, 198.51.100.3" } }))).toBe("198.51.100.2");
  });

  it("returns one opaque correlation ID in rate-limit headers and body", async () => {
    const response = rateLimitResponse({ allowed: false, remaining: 0, retryAfterSeconds: 5 });
    const body = await response.json() as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.requestId).toMatch(/^req_[0-9a-f]{32}$/u);
    expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
  });
});
