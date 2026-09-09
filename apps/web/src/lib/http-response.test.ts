import { describe, expect, it } from "vitest";
import { errorResponse } from "./http-response.js";

describe("public error response", () => {
  it("contains only a stable code and request ID", async () => {
    const requestId = "req_0123456789abcdef0123456789abcdef";
    const response = errorResponse("DEPENDENCY_UNAVAILABLE", 503, requestId);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.json()).toEqual({ error: { code: "DEPENDENCY_UNAVAILABLE", requestId } });
  });
});
