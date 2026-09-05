import { describe, expect, it } from "vitest";
import { LYRIC_LIMITS, LyricValidationError, parseCreateLyricInput, parseUpdateLyricInput } from "./lyric-contract.js";
const songId = "10000000-0000-4000-8000-000000000001";
const requestId = "20000000-0000-4000-8000-000000000001";

describe("lyric text and current-version contract", () => {
  it("preserves mixed Unicode, HTML literals, whitespace and line endings", () => {
    const body = "[Verse 1]\r\n한글 e\u0301 🎵\n\n<script>synthetic</script>  ";
    expect(parseCreateLyricInput({ requestId, title: " 초안 ", body }, songId)).toEqual({ songId, requestId, title: "초안", body, memo: "", status: "draft" });
  });
  it("counts Unicode scalars consistently with PostgreSQL without rejecting valid surrogate pairs", () => {
    expect(parseCreateLyricInput({ requestId, title: "🎵".repeat(200), body: "한".repeat(LYRIC_LIMITS.body) }, songId).body.length).toBe(100_000);
    for (const body of ["한".repeat(100_001), "\u0000", "\ud800", "\udfff"]) {
      expect(() => parseCreateLyricInput({ requestId, title: "합성", body }, songId)).toThrow(LyricValidationError);
    }
  });
  it("rejects invalid identifiers, unsupported states, nontext payloads and empty titles", () => {
    for (const change of [{ requestId: "bad" }, { title: " \n " }, { body: { html: "synthetic" } }, { status: "unknown" }, { memo: "가".repeat(10_001) }]) {
      expect(() => parseCreateLyricInput({ requestId, title: "합성", ...change }, songId)).toThrow(LyricValidationError);
    }
  });
  it("requires a safe expected version and a real change and normalizes pin pairs", () => {
    for (const input of [{ body: "value" }, { rowVersion: 0, body: "value" }, { rowVersion: 1 }, { rowVersion: 1, isFavorite: "true" }, { rowVersion: 1, pinOrder: 1 }]) {
      expect(() => parseUpdateLyricInput(input)).toThrow(LyricValidationError);
    }
    expect(parseUpdateLyricInput({ rowVersion: 2, isPinned: true })).toEqual({ rowVersion: 2, isPinned: true, pinOrder: 0 });
    expect(parseUpdateLyricInput({ rowVersion: 2, isPinned: false })).toEqual({ rowVersion: 2, isPinned: false, pinOrder: null });
  });
});
