import { LibraryViewSettingsConflictError, LibraryViewSettingsValidationError } from "@lyricscloud/domain";
import { describe, expect, it } from "vitest";
import { libraryViewSettingsApiError, libraryViewSettingsResponseHeaders } from "./library-view-settings-api.js";

describe("library view settings API boundary", () => {
  it("maps validation and optimistic conflicts without exposing input", async () => {
    const invalid = libraryViewSettingsApiError(new LibraryViewSettingsValidationError([{ field: "viewMode", code: "unsupported_value" }]));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: { code: "VALIDATION_FAILED", issues: [{ field: "viewMode" }] } });
    const conflict = libraryViewSettingsApiError(new LibraryViewSettingsConflictError());
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: "VERSION_CONFLICT" } });
  });

  it("marks authenticated preference responses private", () => {
    expect(libraryViewSettingsResponseHeaders()).toMatchObject({ "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" });
  });
});
