import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { buildLyricCopyPayload, parseSongForm } from "../../packages/editor/src/index.js";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("1.1.6 editor and recovery surface contract", () => {
  it("keeps visual changes outside the stable editor mount lifecycle", () => {
    const lyric = read("apps/web/src/components/lyric-editor.tsx");
    const rhyme = read("apps/web/src/components/rhyme-editor.tsx");
    const prompt = read("apps/web/src/components/prompt-editor.tsx");

    expect(lyric).toContain('data-editor-surface="lyric"');
    expect(rhyme).toContain('data-editor-surface="rhyme"');
    expect(prompt).toContain('data-editor-surface="prompt"');
    expect(lyric).toMatch(/\}, \[initialLyric\.id, ownerId\]\);/u);
    expect(lyric).toContain("applyLyricNavigation(target, input.find, input.position, input.basisUpdatedAt)");
    expect([lyric, rhyme, prompt].every((source) => source.includes("editor-save-strip"))).toBe(true);
  });

  it("cleans up global listeners and keeps the resource panel a dialog only on mobile", () => {
    const lyric = read("apps/web/src/components/lyric-editor.tsx");
    const resources = read("apps/web/src/components/lyric-resource-panel.tsx");
    for (const source of [lyric, resources]) {
      expect(source.match(/document\.addEventListener\(/gu)?.length ?? 0)
        .toBe(source.match(/document\.removeEventListener\(/gu)?.length ?? 0);
    }
    expect(resources).toContain('role={mobileOpen ? "dialog" : "complementary"}');
    expect(resources).toContain("trapDialogTab(event, \".editor-resource-shell.is-mobile-open\")");
  });

  it("keeps approved B-1 panels isolated from classic and preserves long copy payloads", () => {
    const styles = read("apps/web/src/app/styles.css");
    expect(styles).toContain('html[data-ui-variant="b1"] .editor-save-strip');
    expect(styles).toContain('html[data-ui-variant="b1"] .editor-resource-panel');
    expect(styles).toContain('html[data-ui-variant="b1"] .shared-writer-recovery');

    const lines = Array.from({ length: 10_000 }, (_, index) => index % 250 === 0
      ? `[Chorus: pass ${index}]`
      : index % 251 === 0 ? "[Extend: private note]" : `원문 ${index}  空白`);
    const source = lines.join("\n");
    const started = performance.now();
    const sections = parseSongForm(source);
    const copy = buildLyricCopyPayload(source);
    const elapsed = performance.now() - started;

    expect(sections.filter((section) => section.label === "Chorus")).toHaveLength(40);
    expect(sections.filter((section) => section.label === "Extend")).toHaveLength(39);
    expect(copy.payload).not.toContain("[Extend: private note]");
    expect(copy.payload).toContain("원문 9999  空白");
    expect(copy.codePointCount).toBe([...copy.payload].length);
    expect(elapsed).toBeLessThan(2_500);
  });
});
