import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { safeWorkspaceReturnTo } from "../../apps/web/src/lib/workspace-return.js";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("1.1.7 safe creation return contract", () => {
  it("keeps the current workspace route on quick-add rhyme and prompt links", () => {
    const quickAdd = read("apps/web/src/components/quick-add.tsx");
    expect(quickAdd).toContain('href={`/rhymes/new?returnTo=${encodeURIComponent(returnTo)}`}');
    expect(quickAdd).toContain('href={`/prompts/new?returnTo=${encodeURIComponent(returnTo)}`}');
  });

  it("passes a sanitized return route through both new pages and screens", () => {
    const rhymePage = read("apps/web/src/app/rhymes/new/page.tsx");
    const promptPage = read("apps/web/src/app/prompts/new/page.tsx");
    const rhymeNew = read("apps/web/src/components/rhyme-new-screen.tsx");
    const promptNew = read("apps/web/src/components/prompt-new-screen.tsx");

    for (const source of [rhymePage, promptPage]) {
      expect(source).toContain("safeWorkspaceReturnTo(query.returnTo");
      expect(source).toContain("returnTo={returnTo}");
    }
    expect(rhymePage).toContain("query.returnTo === undefined ? undefined");
    expect(promptPage).toContain("query.returnTo === undefined ? undefined");
    expect(rhymeNew).toContain("returnTo ? withReturnTo(`/rhymes/${result.rhyme.id}`, returnTo)");
    expect(promptNew).toContain("returnTo ? withReturnTo(`/prompts/${id}`, returnTo)");
    expect(rhymeNew).toContain('returnTo ?? "/rhymes"');
    expect(promptNew).toContain('returnTo ?? "/prompts"');
  });

  it("accepts only same-workspace returns", () => {
    expect(safeWorkspaceReturnTo("/lyrics/00000000-0000-4000-8000-000000000000?find=hook", "/rhymes"))
      .toBe("/lyrics/00000000-0000-4000-8000-000000000000?find=hook");
    expect(safeWorkspaceReturnTo("//outside.invalid/lyrics", "/rhymes")).toBe("/rhymes");
    expect(safeWorkspaceReturnTo("https://outside.invalid/prompts", "/prompts")).toBe("/prompts");
    expect(safeWorkspaceReturnTo("/account/withdrawal", "/prompts")).toBe("/prompts");
  });
});

describe("1.1.7 P3 platform interaction contract", () => {
  it("keeps collapsed rail destinations named and shows their label on keyboard focus", () => {
    const shell = read("apps/web/src/components/app-shell.tsx");
    const styles = read("apps/web/src/app/styles.css");

    expect(shell).toContain('aria-label="창작 홈"');
    expect(shell).toContain('aria-label="곡"');
    expect(shell).toContain('aria-label="라임 노트"');
    expect(shell).toContain('aria-label="프롬프트"');
    expect(styles).toContain(".workspace-shell.is-collapsed .nav-item[title]::after");
    expect(styles).toContain(".workspace-shell.is-collapsed .nav-item[title]:focus-visible::after");
  });

  it("retains visible and keyboard alternatives for drag and context-menu actions", () => {
    const order = read("apps/web/src/components/library-order-controls.tsx");
    const prompt = read("apps/web/src/components/prompt-token-builder.tsx");
    const lyric = read("apps/web/src/components/lyric-editor.tsx");

    expect(order).toContain('aria-label={`${title} 앞으로 이동`}');
    expect(order).toContain('aria-label={`${title} 뒤로 이동`}');
    expect(prompt).toContain('aria-label="선택한 태그 순서 변경"');
    expect(prompt).toContain(">앞으로</button>");
    expect(prompt).toContain(">뒤로</button>");
    expect(lyric).toContain(">＋ 송폼 삽입</button>");
  });
});

describe("1.1.7 P4 accessibility fallback contract", () => {
  it("removes translucent blur when the platform requests simpler surfaces", () => {
    const styles = read("apps/web/src/app/styles.css");

    expect(styles).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(styles).toContain("backdrop-filter: none !important");
    expect(styles).toContain("@media (forced-colors: active)");
    expect(styles).toContain("forced-color-adjust: auto");
  });
});
