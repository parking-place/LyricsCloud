import { describe, expect, it } from "vitest";
import { parseRecentWorkQuery, parseSaveLyricPositionInput, RecentWorkValidationError } from "./recent-work-contract.js";

describe("recent work contracts", () => {
  it("parses a bounded type filter", () => {
    expect(parseRecentWorkQuery(new URLSearchParams())).toEqual({ type: "all", limit: 50 });
    expect(parseRecentWorkQuery(new URLSearchParams({ type: "lyrics", limit: "12" }))).toEqual({ type: "lyrics", limit: 12 });
    for (const input of [{ type: "template" }, { limit: "0" }, { limit: "51" }, { limit: "1.5" }] as Array<Record<string, string>>) {
      expect(() => parseRecentWorkQuery(new URLSearchParams(input))).toThrow(RecentWorkValidationError);
    }
  });

  it("accepts content-free lyric positions and normalizes labels", () => {
    expect(parseSaveLyricPositionInput({
      cursorOffset: 42,
      songformLabel: "  Hook  ",
      songformOccurrence: 2,
      scrollTop: 128.8,
      viewport: "mobile"
    })).toEqual({
      cursorOffset: 42,
      songformLabel: "Hook",
      songformOccurrence: 2,
      scrollTop: 129,
      viewport: "mobile"
    });
  });

  it("rejects partial songform and out-of-range position values", () => {
    for (const input of [
      { cursorOffset: -1, songformLabel: null, songformOccurrence: null, scrollTop: 0, viewport: "desktop" },
      { cursorOffset: 0, songformLabel: "Verse", songformOccurrence: null, scrollTop: 0, viewport: "desktop" },
      { cursorOffset: 0, songformLabel: null, songformOccurrence: 1, scrollTop: 0, viewport: "desktop" },
      { cursorOffset: 0, songformLabel: null, songformOccurrence: null, scrollTop: 0, viewport: "tablet" }
    ]) expect(() => parseSaveLyricPositionInput(input)).toThrow(RecentWorkValidationError);
  });
});
