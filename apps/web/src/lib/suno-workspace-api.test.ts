import { describe, expect, it } from "vitest";
import { SunoWorkspaceValidationError } from "@lyricscloud/domain";
import {
  SunoWorkspaceConflictError,
  SunoWorkspaceDuplicateUrlError,
  SunoWorkspaceLimitError,
  SunoWorkspaceNotFoundError,
  SunoWorkspaceOrderSetError,
  SunoWorkspaceRequestReuseError
} from "@lyricscloud/database";
import { sunoWorkspaceApiError } from "./suno-workspace-api.js";

describe("Suno workspace API errors", () => {
  it.each([
    [new SunoWorkspaceNotFoundError(), 404, "NOT_FOUND"],
    [new SunoWorkspaceDuplicateUrlError(), 409, "CONFLICT"],
    [new SunoWorkspaceLimitError(), 409, "CONFLICT"],
    [new SunoWorkspaceOrderSetError(), 409, "CONFLICT"],
    [new SunoWorkspaceRequestReuseError(), 409, "CONFLICT"]
  ] as const)("maps %s to a private stable response", async (error, status, code) => {
    const response = sunoWorkspaceApiError(error);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({ error: { code, requestId: expect.any(String) } });
  });

  it("returns the current aggregate version without storage details", async () => {
    const response = sunoWorkspaceApiError(new SunoWorkspaceConflictError(7));
    expect(await response.json()).toMatchObject({
      error: { code: "VERSION_CONFLICT", details: { currentVersion: 7 } }
    });
  });

  it("returns field-safe validation issues", async () => {
    const response = sunoWorkspaceApiError(new SunoWorkspaceValidationError([{ field: "url", code: "invalid" }]));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_FAILED", issues: [{ field: "url", code: "invalid" }] }
    });
  });
});
