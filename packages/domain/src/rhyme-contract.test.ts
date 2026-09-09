import { describe, expect, it } from "vitest";
import { normalizeRhymeTag, parseCreateRhymeNoteInput, parseRhymeListInput, parseRhymeTagInput, parseUpdateRhymeNoteInput, RhymeValidationError } from "./rhyme-contract.js";

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

  it("parses tag mutation bodies with the same normalization and limits", () => {
    expect(parseRhymeTagInput({ value: "  FIRE\t tag  " })).toBe("FIRE tag");
    expect(() => parseRhymeTagInput({ value: "" })).toThrow(RhymeValidationError);
    expect(() => parseRhymeTagInput({ value: "가".repeat(51) })).toThrow(RhymeValidationError);
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

  it("validates combined list filters and resets defaults deterministically", () => {
    const tag = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const song = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    expect(parseRhymeListInput(new URLSearchParams({ search: "  Air  ", tag, song, sort: "title_asc", limit: "12" })))
      .toEqual({ search: "Air", tagId: tag, songId: song, sort: "title_asc", limit: 12 });
    expect(parseRhymeListInput(new URLSearchParams())).toEqual({ sort: "updated_desc", limit: 20 });
    expect(() => parseRhymeListInput(new URLSearchParams({ tag: "unsafe" }))).toThrow(RhymeValidationError);
    expect(() => parseRhymeListInput(new URLSearchParams({ sort: "random" }))).toThrow(RhymeValidationError);
    expect(() => parseRhymeListInput(new URLSearchParams({ limit: "51" }))).toThrow(RhymeValidationError);
  });
});
