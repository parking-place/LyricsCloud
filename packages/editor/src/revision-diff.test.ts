import { describe, expect, it } from "vitest";
import { compareRevisionLines } from "./revision-diff.js";

describe("line comparison", () => {
  it("preserves Korean, song forms, blank lines and terminal newline differences in both panes", () => {
    const current = "[Verse]\n한글 🎵\n\n옛 표현\n";
    const selected = "[Verse]\n한글 🎵\n\n새 표현";
    const result = compareRevisionLines(current, selected);
    expect(result.left.map((line) => line.text).join("")).toBe(current);
    expect(result.right.map((line) => line.text).join("")).toBe(selected);
    expect(result.left.filter((line) => line.kind === "removed")).toEqual([{ text: "옛 표현\n", number: 4, kind: "removed" }]);
    expect(result.right.filter((line) => line.kind === "added")).toEqual([{ text: "새 표현", number: 4, kind: "added" }]);
    expect(compareRevisionLines("", "").identical).toBe(true);
  });
  it("bounds a large rewrite without losing either document", () => {
    const current = "가\n".repeat(10_000), selected = "나\n".repeat(10_000);
    const result = compareRevisionLines(current, selected);
    expect(result.left.map((line) => line.text).join("")).toBe(current);
    expect(result.right.map((line) => line.text).join("")).toBe(selected);
    expect(result.simplified).toBe(true);
  });
});
