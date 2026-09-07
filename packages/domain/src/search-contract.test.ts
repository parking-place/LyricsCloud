import { describe, expect, it } from "vitest";
import {
  escapeSearchLikeLiteral, findSearchLiteralRange, normalizeSearchText, parseRecordRecentSearchInput, parseUnifiedSearchInput, SearchValidationError
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

  it("parses the bounded recent-search write contract", () => {
    expect(parseRecordRecentSearchInput({ query: "  ＦＩＲＥ  ", type: "lyrics" }))
      .toEqual({ query: "fire", type: "lyrics" });
    expect(() => parseRecordRecentSearchInput({ query: "", type: "all" })).toThrow(SearchValidationError);
    expect(() => parseRecordRecentSearchInput({ query: "ok", type: "template" })).toThrow(SearchValidationError);
  });

  it("maps normalized literal matches back to safe authored-text offsets", () => {
    const text = "앞  ＦＩＲＥ\n\tVerse １ 뒤";
    const range = findSearchLiteralRange(text, "fire verse 1");
    expect(range && text.slice(range.from, range.to)).toBe("ＦＩＲＥ\n\tVerse １");
    expect(findSearchLiteralRange("<script>alert(1)</script>", "<script>"))
      .toEqual({ from: 0, to: 8 });
    const decomposed = "Cafe\u0301 후렴";
    const decomposedRange = findSearchLiteralRange(decomposed, "CAFÉ");
    expect(decomposedRange && decomposed.slice(decomposedRange.from, decomposedRange.to)).toBe("Cafe\u0301");
    expect(findSearchLiteralRange(text, "missing")).toBeNull();
  });
});
