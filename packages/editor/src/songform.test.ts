import { ChangeSet, Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { findSongFormSection, parseSongForm, SongFormIndex } from "./songform.js";

describe("song-form parser", () => {
  it("recognizes standard, Korean, custom, numbered and repeated labels in source order", () => {
    const source = "머리말\r\n [Intro] \r\n시작\r\n[Verse 1]\r\n벌스\r\n[후렴]\r\n한국어\r\n[Final Hook]\r\n끝\r\n[후렴]";
    const sections = parseSongForm(source);
    expect(sections.map(({ label, occurrence, line }) => ({ label, occurrence, line }))).toEqual([
      { label: "Intro", occurrence: 1, line: 2 },
      { label: "Verse 1", occurrence: 1, line: 4 },
      { label: "후렴", occurrence: 1, line: 6 },
      { label: "Final Hook", occurrence: 1, line: 8 },
      { label: "후렴", occurrence: 2, line: 10 }
    ]);
    expect(new Set(sections.map((section) => section.id)).size).toBe(sections.length);
    expect(sections[2]?.id).toContain(`${sections[2]?.tagFrom}-1`);
    expect(sections[4]?.id).toContain(`${sections[4]?.tagFrom}-2`);
  });

  it("rejects empty, unclosed, nested and in-line bracket text", () => {
    expect(parseSongForm("[]\n[ ]\n[Verse\n가사 [Hook]\n[[Bridge]]\n[정상]")).toEqual([
      expect.objectContaining({ label: "정상", line: 6 })
    ]);
  });

  it("computes exact tag-inclusive ranges through the final document character", () => {
    const source = "before\n[Verse]\none\n\n[Hook]\ntwo";
    const sections = parseSongForm(source);
    expect(source.slice(sections[0]?.from, sections[0]?.to)).toBe("[Verse]\none\n\n");
    expect(source.slice(sections[1]?.from, sections[1]?.to)).toBe("[Hook]\ntwo");
    expect(findSongFormSection(sections, source.indexOf("one"))?.label).toBe("Verse");
    expect(findSongFormSection(sections, 0)).toBeNull();
  });

  it("rescans only changed neighbouring lines in a long document", () => {
    const source = Array.from({ length: 500 }, (_, index) => `[Verse ${index + 1}]\n${"가".repeat(180)}`).join("\n");
    const before = Text.of(source.split("\n"));
    const index = SongFormIndex.create(before);
    const changeAt = source.indexOf("가", Math.floor(source.length / 2));
    const changes = ChangeSet.of({ from: changeAt, to: changeAt + 1, insert: "끝" }, before.length);
    const after = changes.apply(before);
    const updated = index.update(before, after, changes);
    expect(updated.sections(after)).toEqual(SongFormIndex.create(after).sections(after));
    expect(updated.sections(after)).toHaveLength(500);
    expect(updated.scannedCharacters).toBeLessThan(600);
  });

  it("adds and removes tags across line-boundary edits without stale markers", () => {
    let document = Text.of("[Verse]\none\n[Hook]\ntwo".split("\n"));
    let index = SongFormIndex.create(document);
    const hookStart = document.toString().indexOf("[Hook]");
    const removeHook = ChangeSet.of({ from: hookStart, to: hookStart + 6, insert: "Hook" }, document.length);
    const withoutHook = removeHook.apply(document);
    index = index.update(document, withoutHook, removeHook);
    expect(index.sections(withoutHook)).toEqual(SongFormIndex.create(withoutHook).sections(withoutHook));
    expect(index.sections(withoutHook).map((section) => section.label)).toEqual(["Verse"]);

    document = withoutHook;
    const insertBridge = ChangeSet.of({ from: document.length, insert: "\n[Bridge]\nend" }, document.length);
    const withBridge = insertBridge.apply(document);
    index = index.update(document, withBridge, insertBridge);
    expect(index.sections(withBridge)).toEqual(SongFormIndex.create(withBridge).sections(withBridge));
    expect(index.sections(withBridge).map((section) => section.label)).toEqual(["Verse", "Bridge"]);
  });
});
