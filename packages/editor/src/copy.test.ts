import { describe, expect, it } from "vitest";
import { buildLyricCopyPayload, copySongFormSections, copyWholeLyric, LYRIC_COPY_WARNING_LIMIT } from "./copy.js";
import { parseSongForm } from "./songform.js";

describe("lyric copy contract", () => {
  it("copies the current whole document and normalizes CRLF and CR", () => {
    expect(copyWholeLyric("머리말\r\n[Verse]\r본문\n끝")).toBe("머리말\n[Verse]\n본문\n끝");
  });

  it("copies one exact tag-inclusive section including blank lines", () => {
    const body = "머리말\n[Verse: whisper]\n첫 줄\n\n둘째 줄\n[Hook]\n후렴";
    const sections = parseSongForm(body);
    expect(copySongFormSections(body, sections, [sections[0]!.id])).toBe("[Verse: whisper]\n첫 줄\n\n둘째 줄\n");
    expect(copySongFormSections(body, sections, [sections[1]!.id])).toBe("[Hook]\n후렴");
  });

  it("sorts repeated selections by source position and inserts only a missing boundary LF", () => {
    const body = "[Hook]\n첫 후렴\n[Verse 2]\n두 번째 절\n[Hook]\n마지막 후렴";
    const sections = parseSongForm(body);
    expect(copySongFormSections(body, sections, [sections[2]!.id, sections[0]!.id])).toBe(
      "[Hook]\n첫 후렴\n[Hook]\n마지막 후렴"
    );

    const adjacentBody = "[Verse]\n본문\n[Hook]\n끝";
    const adjacent = parseSongForm(adjacentBody);
    const firstWithoutBoundary = { ...adjacent[0]!, to: adjacent[0]!.to - 1 };
    expect(copySongFormSections(adjacentBody, [firstWithoutBoundary, adjacent[1]!], adjacent.map((section) => section.id))).toBe("[Verse]\n본문\n[Hook]\n끝");
  });

  it("returns an empty string when no existing section is selected", () => {
    const body = "[Verse]\n본문";
    expect(copySongFormSections(body, parseSongForm(body), ["missing"])).toBe("");
  });

  it("counts the final LF payload by Unicode code point and warns only above 3000", () => {
    expect(LYRIC_COPY_WARNING_LIMIT).toBe(3_000);
    for (const length of [2_999, 3_000, 3_001]) {
      expect(buildLyricCopyPayload("가".repeat(length))).toEqual({
        payload: "가".repeat(length), codePointCount: length, exceedsRecommendedLimit: length > 3_000
      });
    }
    expect(buildLyricCopyPayload("🙂\r\ne\u0301")).toEqual({
      payload: "🙂\ne\u0301", codePointCount: 4, exceedsRecommendedLimit: false
    });
  });
});
