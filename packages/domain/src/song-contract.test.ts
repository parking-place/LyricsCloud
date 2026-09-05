import { describe, expect, it } from "vitest";
import {
  SongValidationError,
  parseCreateSongInput,
  parsePinInput,
  parseSongListInput,
  parseUpdateSongInput
} from "./song-contract.js";

describe("song command contract", () => {
  it("normalizes defaults and title without changing authored notes", () => {
    expect(parseCreateSongInput({
      requestId: "00000000-0000-4000-8000-000000000111",
      title: "  새 노래  ",
      workNotes: "  메모 원문  "
    })).toEqual({
      requestId: "00000000-0000-4000-8000-000000000111",
      title: "새 노래",
      description: "",
      workNotes: "  메모 원문  ",
      status: "idea",
      color: null,
      isFavorite: false,
      isPinned: false,
      pinOrder: null
    });
  });

  it("reports field-specific validation issues", () => {
    expect(() => parseCreateSongInput({ requestId: "bad", title: " ", color: "purple" })).toThrow(SongValidationError);
    try { parseUpdateSongInput({ title: "가".repeat(201), status: "unknown" }); }
    catch (error) {
      expect((error as SongValidationError).issues).toEqual([
        { field: "title", code: "too_long" },
        { field: "status", code: "unsupported_value" }
      ]);
    }
  });

  it("keeps pin state internally consistent", () => {
    expect(parsePinInput({ value: true })).toEqual({ isPinned: true, pinOrder: 0 });
    expect(parsePinInput({ value: false })).toEqual({ isPinned: false, pinOrder: null });
    expect(() => parsePinInput({ value: false, pinOrder: 2 })).toThrow(SongValidationError);
  });

  it("validates list filters, sort, cursor size, and bounds", () => {
    expect(parseSongListInput(new URLSearchParams("search=%20한글%20&status=idea&sort=title_asc&limit=30"))).toEqual({
      search: "한글", status: "idea", sort: "title_asc", limit: 30
    });
    expect(() => parseSongListInput(new URLSearchParams("sort=nope&limit=0"))).toThrow(SongValidationError);
  });
});
