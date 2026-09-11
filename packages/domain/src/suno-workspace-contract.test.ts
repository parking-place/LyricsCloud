import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SunoWorkspaceValidationError, parseSunoWorkspaceCommand } from "./suno-workspace-contract.js";

describe("Suno workspace command parser", () => {
  it("parses all five fixed commands", () => {
    const requestId = randomUUID();
    const linkId = randomUUID();
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 0, command: "set_model", modelLabel: null })).toMatchObject({ command: "set_model", modelLabel: null });
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 1, command: "create_link", url: "https://suno.com/s/Abc12345", title: "", note: "" })).toMatchObject({ command: "create_link" });
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 2, command: "update_link", linkId, title: "Take 2" })).toMatchObject({ command: "update_link", linkId, title: "Take 2" });
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 3, command: "remove_link", linkId })).toMatchObject({ command: "remove_link", linkId });
    expect(parseSunoWorkspaceCommand({ requestId, expectedVersion: 4, command: "reorder_links", linkIds: [linkId] })).toMatchObject({ command: "reorder_links", linkIds: [linkId] });
  });

  it.each([
    [{}, "requestId"],
    [{ requestId: randomUUID(), expectedVersion: -1, command: "set_model", modelLabel: "v5" }, "expectedVersion"],
    [{ requestId: randomUUID(), expectedVersion: 0, command: "set_model", modelLabel: "x".repeat(65) }, "modelLabel"],
    [{ requestId: randomUUID(), expectedVersion: 0, command: "update_link", linkId: randomUUID() }, "body"],
    [{ requestId: randomUUID(), expectedVersion: 0, command: "unknown" }, "command"]
  ])("rejects invalid command %#", (value, field) => {
    try {
      parseSunoWorkspaceCommand(value);
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(SunoWorkspaceValidationError);
      expect((error as SunoWorkspaceValidationError).issues.some((issue) => issue.field === field)).toBe(true);
    }
  });
});
