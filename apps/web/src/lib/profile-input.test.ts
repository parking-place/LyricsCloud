import { describe, expect, it } from "vitest";
import { parseProfileInput, ProfileInputError } from "./profile-input.js";

describe("profile input", () => {
  it("normalizes supported fields and never returns a client owner_id", () => {
    const result = parseProfileInput({ expectedRowVersion: 2, displayName: "  Writer  " });
    expect(result).toEqual({ expectedRowVersion: 2, displayName: "Writer" });
    expect(result).not.toHaveProperty("owner_id");
  });

  it("keeps omitted fields distinct from explicit provider reset", () => {
    expect(parseProfileInput({ expectedRowVersion: 3, displayName: null }))
      .toEqual({ expectedRowVersion: 3, displayName: null });
    expect(parseProfileInput({ expectedRowVersion: 3, avatar: null }))
      .toEqual({ expectedRowVersion: 3, avatar: null });
  });

  it.each([
    [{ expectedRowVersion: 1 }, ["body"]],
    [{ expectedRowVersion: 1, displayName: "" }, ["displayName"]],
    [{ expectedRowVersion: 1, avatar: "javascript:alert(1)" }, ["avatar"]],
    [{ expectedRowVersion: 1, displayName: "Writer", avatarUrl: "https://example.test/a" }, ["body"]],
    [{ expectedRowVersion: 0, displayName: "Writer" }, ["expectedRowVersion"]]
  ])("rejects invalid input without echoing values", (input, fields) => {
    try { parseProfileInput(input); } catch (error) {
      expect(error).toBeInstanceOf(ProfileInputError);
      expect((error as ProfileInputError).fields).toEqual(fields);
      expect(String(error)).not.toContain("javascript");
    }
  });
});
