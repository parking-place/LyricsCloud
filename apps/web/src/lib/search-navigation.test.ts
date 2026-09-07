import { describe, expect, it } from "vitest";
import { buildSearchResultHref, buildSearchUrl } from "./search-navigation.js";

describe("unified search navigation", () => {
  it("serializes query and type as bounded URL parameters", () => {
    expect(buildSearchUrl("  ＦＩＲＥ  ", "lyrics")).toBe("/search?q=fire&type=lyrics");
    expect(buildSearchUrl("", "all")).toBe("/search");
    expect(buildSearchUrl("<script>alert(1)</script>", "all"))
      .toBe("/search?q=%3Cscript%3Ealert%281%29%3C%2Fscript%3E");
  });

  it("adds a text-find hint only for lyric body matches", () => {
    const lyric = buildSearchResultHref({ id: "07000000-0000-4000-8000-000000000001", type: "lyrics", matchField: "body" }, "Verse １", "all");
    expect(lyric).toContain("/lyrics/07000000-0000-4000-8000-000000000001?");
    expect(new URL(lyric, "https://lyricscloud.local").searchParams.get("find")).toBe("verse 1");
    const song = buildSearchResultHref({ id: "07000000-0000-4000-8000-000000000002", type: "song", matchField: "title" }, "fire", "song");
    expect(new URL(song, "https://lyricscloud.local").searchParams.has("find")).toBe(false);
  });
});
