import { describe, expect, it } from "vitest";
import { parseProfileInput, ProfileInputError } from "./profile-input.js";

describe("profile input", () => {
  it("normalizes supported fields and never returns a client owner_id", () => {
    const result = parseProfileInput({ displayName: "  Writer  ", avatarUrl: "https://example.test/avatar.png", owner_id: "attacker" });
    expect(result).toEqual({ displayName: "Writer", avatarUrl: "https://example.test/avatar.png" });
    expect(result).not.toHaveProperty("owner_id");
  });

  it.each([
    [{}, ["displayName"]],
    [{ displayName: "" }, ["displayName"]],
    [{ displayName: "Writer", avatarUrl: "javascript:alert(1)" }, ["avatarUrl"]]
  ])("rejects invalid input without echoing values", (input, fields) => {
    try { parseProfileInput(input); } catch (error) {
      expect(error).toBeInstanceOf(ProfileInputError);
      expect((error as ProfileInputError).fields).toEqual(fields);
      expect(String(error)).not.toContain("javascript");
    }
  });
});
