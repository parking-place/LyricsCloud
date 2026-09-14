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
    expect(rhymeNew).toContain('returnTo = "/rhymes"');
    expect(promptNew).toContain('returnTo = "/prompts"');
    expect(rhymeNew).toContain("withReturnTo(`/rhymes/${result.rhyme.id}`, returnTo)");
    expect(promptNew).toContain("withReturnTo(`/prompts/${id}`, returnTo)");
  });

  it("accepts only same-workspace returns", () => {
    expect(safeWorkspaceReturnTo("/lyrics/00000000-0000-4000-8000-000000000000?find=hook", "/rhymes"))
      .toBe("/lyrics/00000000-0000-4000-8000-000000000000?find=hook");
    expect(safeWorkspaceReturnTo("//outside.invalid/lyrics", "/rhymes")).toBe("/rhymes");
    expect(safeWorkspaceReturnTo("https://outside.invalid/prompts", "/prompts")).toBe("/prompts");
    expect(safeWorkspaceReturnTo("/account/withdrawal", "/prompts")).toBe("/prompts");
  });
});
