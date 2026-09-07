import { describe, expect, it } from "vitest";
import {
  escapeSearchLikeLiteral, normalizeSearchText, parseUnifiedSearchInput, SearchValidationError
} from "./search-contract.js";

describe("unified search contract", () => {
  it("normalizes compatibility Unicode, English case and whitespace without changing literals", () => {
    expect(normalizeSearchText("  ＦＩＲＥ\n\tVerse １  ")).toBe("fire verse 1");
    expect(normalizeSearchText("100%  _air  \\ ")).toBe("100% _air \\");
    expect(escapeSearchLikeLiteral("100%_air\\hook")).toBe("100\\%\\_air\\\\hook");
  });

  it("parses one bounded relevance page and an optional type", () => {
    expect(parseUnifiedSearchInput(new URLSearchParams({ q: "  Verse １ ", type: "lyrics", limit: "12" })))
      .toEqual({ query: "verse 1", type: "lyrics", limit: 12 });
    expect(parseUnifiedSearchInput(new URLSearchParams({ q: "가" })))
      .toEqual({ query: "가", type: "all", limit: 20 });
  });

  it("rejects empty, oversized and unsupported inputs", () => {
    for (const input of [
      {}, { q: "가".repeat(201) }, { q: "ok", type: "template" }, { q: "ok", limit: "0" },
      { q: "ok", cursor: "not+a+cursor" }
    ] as Array<Record<string, string>>) {
      expect(() => parseUnifiedSearchInput(new URLSearchParams(input))).toThrow(SearchValidationError);
    }
  });
});
