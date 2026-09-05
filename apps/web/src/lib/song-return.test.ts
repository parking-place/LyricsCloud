import { describe, expect, it } from "vitest";
import { safeSongReturnTo } from "./song-return.js";

describe("song return location", () => {
  it("accepts internal song-list state and rejects external redirects", () => {
    expect(safeSongReturnTo("/songs?status=idea&sort=title_asc")).toBe("/songs?status=idea&sort=title_asc");
    expect(safeSongReturnTo("//example.invalid")).toBe("/songs");
    expect(safeSongReturnTo("https://example.invalid")).toBe("/songs");
    expect(safeSongReturnTo("/songs/another-detail")).toBe("/songs");
    expect(safeSongReturnTo(undefined)).toBe("/songs");
  });
});
