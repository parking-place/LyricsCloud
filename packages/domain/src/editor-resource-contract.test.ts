import { describe, expect, it } from "vitest";
import { EditorResourceValidationError, parseEditorResourcePanelInput } from "./editor-resource-contract.js";

describe("editor resource panel contract", () => {
  it("normalizes the shared four-tab query", () => {
    expect(parseEditorResourcePanelInput(new URLSearchParams())).toEqual({ tab: "lyrics", scope: "all", limit: 50 });
    expect(parseEditorResourcePanelInput(new URLSearchParams({ tab: "rhymes", scope: "linked", search: "  라임  ", limit: "12" })))
      .toEqual({ tab: "rhymes", scope: "linked", search: "라임", limit: 12 });
    expect(parseEditorResourcePanelInput(new URLSearchParams({ tab: "songs", scope: "linked" })).scope).toBe("all");
  });

  it("rejects invalid shared queries", () => {
    const invalid: Record<string, string>[] = [
      { tab: "unknown" }, { scope: "owner" }, { limit: "0" }, { limit: "51" }, { search: "가".repeat(201) }
    ];
    for (const value of invalid) {
      expect(() => parseEditorResourcePanelInput(new URLSearchParams(value))).toThrow(EditorResourceValidationError);
    }
  });
});
