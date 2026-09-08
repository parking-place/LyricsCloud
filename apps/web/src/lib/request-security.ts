import { createRequestId } from "@lyricscloud/observability";
import { privateResponseHeaders } from "./http-response.js";

export const MAX_API_BODY_BYTES = 1024 * 1024;

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class TokenBucketRateLimiter {
  readonly #buckets = new Map<string, Bucket>();

  consume(key: string, capacity: number, refillWindowMs: number, now = Date.now()): RateLimitDecision {
    if (!Number.isInteger(capacity) || capacity < 1 || refillWindowMs < 1) throw new RangeError("INVALID_RATE_LIMIT");
    const previous = this.#buckets.get(key);
    const elapsed = Math.max(0, now - (previous?.updatedAt ?? now));
    const available = Math.min(capacity, (previous?.tokens ?? capacity) + elapsed * capacity / refillWindowMs);
    const allowed = available >= 1;
    const tokens = allowed ? available - 1 : available;
    this.#buckets.set(key, { tokens, updatedAt: now });
    if (this.#buckets.size > 10_000) this.#prune(now, refillWindowMs);
    return {
      allowed,
      remaining: Math.max(0, Math.floor(tokens)),
      retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((1 - tokens) * refillWindowMs / capacity / 1000))
    };
  }

  #prune(now: number, refillWindowMs: number): void {
    for (const [key, bucket] of this.#buckets) {
      if (now - bucket.updatedAt >= refillWindowMs) this.#buckets.delete(key);
      if (this.#buckets.size <= 8_000) break;
    }
    for (const key of this.#buckets.keys()) {
      if (this.#buckets.size <= 8_000) break;
      this.#buckets.delete(key);
    }
  }
}

const globalRateLimit = globalThis as typeof globalThis & { lyricsCloudRateLimiter?: TokenBucketRateLimiter };
export const requestRateLimiter = globalRateLimit.lyricsCloudRateLimiter ??= new TokenBucketRateLimiter();

export function requestClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || forwarded
    || "unknown-client";
}

export function rateLimitResponse(decision: RateLimitDecision): Response {
  const requestId = createRequestId();
  return Response.json(
    { error: { code: "RATE_LIMITED", requestId } },
    { status: 429, headers: { ...privateResponseHeaders, "Retry-After": String(decision.retryAfterSeconds), "x-request-id": requestId } }
  );
}

export async function apiBodyExceedsLimit(request: Request, maxBytes = MAX_API_BODY_BYTES): Promise<boolean> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) return true;
  }
  if (!request.body) return false;
  const reader = request.clone().body!.getReader();
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return false;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        // A cloned Fetch body is a tee. Waiting for cancel can deadlock until the
        // untouched route branch is consumed, which never happens for a 413.
        void reader.cancel();
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
