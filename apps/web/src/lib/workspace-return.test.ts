import { expect, it } from "vitest";
import { safeWorkspaceReturnTo } from "./workspace-return.js";

it("keeps only local workspace return paths", () => {
  expect(safeWorkspaceReturnTo("/rhymes?search=air")).toBe("/rhymes?search=air");
  expect(safeWorkspaceReturnTo("/lyrics/00000000-0000-4000-8000-000000000000")).toContain("/lyrics/");
  expect(safeWorkspaceReturnTo("//example.invalid")).toBe("/songs");
  expect(safeWorkspaceReturnTo("https://example.invalid")).toBe("/songs");
});
