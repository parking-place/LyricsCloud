import { describe, expect, it } from "vitest";
import { normalizeRhymeTag, parseCreateRhymeNoteInput, parseUpdateRhymeNoteInput, RhymeValidationError } from "./rhyme-contract.js";

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("rhyme note contract", () => {
  it("normalizes line endings and common display properties", () => {
    expect(parseCreateRhymeNoteInput({ requestId, title: "  표현 모음  ", body: "air\r\nchair", isPinned: true, color: "red" })).toEqual({
      requestId, title: "표현 모음", body: "air\nchair", isFavorite: false,
      isPinned: true, pinOrder: 0, color: "red"
    });
  });

  it("normalizes tag identity across whitespace, case and Unicode composition", () => {
    expect(normalizeRhymeTag("  FIrE\t tag ")).toEqual({ displayValue: "FIrE tag", normalizedValue: "fire tag" });
    expect(normalizeRhymeTag("  가  ")).toEqual(normalizeRhymeTag("가"));
  });

  it("rejects oversized, malformed and empty values", () => {
    expect(() => parseCreateRhymeNoteInput({ requestId, title: " ", body: "" })).toThrow(RhymeValidationError);
    expect(() => parseCreateRhymeNoteInput({ requestId, title: "제목", body: "가".repeat(100_001) })).toThrow("VALIDATION_FAILED");
    expect(() => normalizeRhymeTag("태".repeat(51))).toThrow("VALIDATION_FAILED");
  });

  it("keeps pin state and version updates explicit", () => {
    expect(parseUpdateRhymeNoteInput({ rowVersion: 2, isPinned: false, pinOrder: 9 })).toEqual({ rowVersion: 2, isPinned: false, pinOrder: null });
    expect(() => parseUpdateRhymeNoteInput({ rowVersion: 2, pinOrder: 1 })).toThrow("VALIDATION_FAILED");
    expect(() => parseUpdateRhymeNoteInput({ rowVersion: 0, body: "내용" })).toThrow("VALIDATION_FAILED");
  });
});
