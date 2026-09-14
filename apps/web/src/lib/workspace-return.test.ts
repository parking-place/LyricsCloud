import { expect, it } from "vitest";
import { safeWorkspaceReturnTo, withReturnTo } from "./workspace-return.js";

it("keeps only local workspace return paths", () => {
  expect(safeWorkspaceReturnTo("/rhymes?search=air")).toBe("/rhymes?search=air");
  expect(safeWorkspaceReturnTo("/lyrics/00000000-0000-4000-8000-000000000000")).toContain("/lyrics/");
  expect(safeWorkspaceReturnTo("//example.invalid")).toBe("/songs");
  expect(safeWorkspaceReturnTo("https://example.invalid")).toBe("/songs");
});

it("keeps a caller-specific list fallback without weakening path validation", () => {
  expect(safeWorkspaceReturnTo(undefined, "/rhymes")).toBe("/rhymes");
  expect(safeWorkspaceReturnTo("https://evil.example/search", "/prompts")).toBe("/prompts");
  expect(safeWorkspaceReturnTo("/search?q=hook", "/prompts")).toBe("/search?q=hook");
  expect(safeWorkspaceReturnTo("/recent?type=lyrics", "/prompts")).toBe("/recent?type=lyrics");
});

it("adds an encoded return route without dropping an existing query", () => {
  const returnTo = "/lyrics/00000000-0000-4000-8000-000000000000?returnTo=%2Frecent%3Ftype%3Dlyrics";
  expect(withReturnTo("/rhymes/11111111-1111-4111-8111-111111111111", returnTo))
    .toBe(`/rhymes/11111111-1111-4111-8111-111111111111?returnTo=${encodeURIComponent(returnTo)}`);
  expect(withReturnTo("/prompts/new?template=22222222-2222-4222-8222-222222222222", returnTo))
    .toBe(`/prompts/new?template=22222222-2222-4222-8222-222222222222&returnTo=${encodeURIComponent(returnTo)}`);
});
