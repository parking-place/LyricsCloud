import { describe, expect, it } from "vitest";
import {
  normalizeResourceTitle,
  RESOURCE_COLORS,
  RESOURCE_LIMITS,
  RESOURCE_TYPES,
  SONG_STATUSES,
  SONG_STATUS_LABELS
} from "./resource-contract.js";

describe("resource validation contract", () => {
  it("keeps the database and UI value sets explicit", () => {
    expect(RESOURCE_TYPES).toEqual(["song", "lyrics", "rhyme_note", "prompt", "template"]);
    expect(RESOURCE_COLORS).toEqual(["red", "yellow", "green", "blue", "gray"]);
    expect(SONG_STATUSES.map((status) => SONG_STATUS_LABELS[status])).toEqual([
      "아이디어",
      "가사 작성 중",
      "수정 중",
      "Suno 생성 중",
      "믹싱 중",
      "완성",
      "보류"
    ]);
  });

  it("publishes canonical limits and title normalization", () => {
    expect(RESOURCE_LIMITS).toEqual({ title: 200, songDescription: 2_000, songWorkNotes: 10_000 });
    expect(normalizeResourceTitle("  새 곡  ")).toBe("새 곡");
  });
});
