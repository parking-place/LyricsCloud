import { describe, expect, it } from "vitest";
import { validateSongForm, type SongFormValues } from "./song-form-validation.js";

const base: SongFormValues = {
  title: "테스트 곡",
  description: "",
  workNotes: "",
  status: "idea",
  color: null,
  isFavorite: false,
  isPinned: false
};

describe("song form validation", () => {
  it("uses the domain title and memo boundaries", () => {
    expect(validateSongForm(base)).toEqual({});
    expect(validateSongForm({ ...base, title: "  " })).toEqual({ title: "곡 제목을 입력해 주세요." });
    expect(validateSongForm({ ...base, title: "가".repeat(201) }).title).toContain("200");
    expect(validateSongForm({ ...base, description: "가".repeat(2001) }).description).toContain("2,000");
    expect(validateSongForm({ ...base, workNotes: "가".repeat(10001) }).workNotes).toContain("10,000");
  });
});
