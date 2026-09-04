import { describe, expect, it } from "vitest";
import { errorResponse } from "./http-response.js";

describe("public error response", () => {
  it("contains only a stable code and request ID", async () => {
    const response = errorResponse("DEPENDENCY_UNAVAILABLE", 503, "request_test");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ error: { code: "DEPENDENCY_UNAVAILABLE", requestId: "request_test" } });
  });
});
