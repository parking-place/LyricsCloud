import { describe, expect, it } from "vitest";
import { parsePinOrder, parseSavedResourceQuery, parseSavedToggle, SavedResourceValidationError } from "./saved-resource-contract.js";

describe("saved resource contracts", () => {
  it("parses stable URL filters", () => {
    const song = "00000000-0000-4000-8000-000000000001";
    expect(parseSavedResourceQuery(new URLSearchParams(`type=lyrics&scope=pinned&status=revising&song=${song}`)))
      .toEqual({ type: "lyrics", scope: "pinned", status: "revising", songId: song });
    expect(parseSavedResourceQuery(new URLSearchParams())).toEqual({ type: "all", scope: "all", status: "all" });
  });

  it("rejects invalid filters, toggles and pin sets", () => {
    for (const query of ["type=nope", "scope=nope", "status=nope", "song=nope"]) {
      expect(() => parseSavedResourceQuery(new URLSearchParams(query))).toThrow(SavedResourceValidationError);
    }
    expect(() => parseSavedToggle({ value: "true" })).toThrow(SavedResourceValidationError);
    expect(() => parsePinOrder({ ids: ["bad"] })).toThrow(SavedResourceValidationError);
    const id = "00000000-0000-4000-8000-000000000001";
    expect(() => parsePinOrder({ ids: [id, id] })).toThrow(SavedResourceValidationError);
  });
});
