import { describe, expect, it } from "vitest";
import { parsePublicErrorCode, parsePublicRequestId } from "./error-contract.js";

describe("public error contract", () => {
  it("reads structured and transitional error codes", () => {
    expect(parsePublicErrorCode({ error: { code: "REVISION_CURRENT_CHANGED" } })).toBe("REVISION_CURRENT_CHANGED");
    expect(parsePublicErrorCode({ error: "REVISION_UNAVAILABLE" })).toBe("REVISION_UNAVAILABLE");
  });

  it("rejects authored text and malformed codes", () => {
    expect(parsePublicErrorCode({ error: { code: "Something went wrong" } })).toBeUndefined();
    expect(parsePublicErrorCode({ error: "revision_unavailable" })).toBeUndefined();
    expect(parsePublicErrorCode({ error: { code: "A".repeat(81) } })).toBeUndefined();
  });

  it("accepts only dedicated public request identifiers", () => {
    const requestId = "req_0123456789abcdef0123456789abcdef";
    expect(parsePublicRequestId({ error: { code: "REVISION_UNAVAILABLE", requestId } })).toBe(requestId);
    expect(parsePublicRequestId({ error: { code: "REVISION_UNAVAILABLE", requestId: "trace-123" } })).toBeUndefined();
    expect(parsePublicRequestId({ error: "REVISION_UNAVAILABLE" })).toBeUndefined();
  });
});
