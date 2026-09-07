import { describe, expect, it } from "vitest";
import { buildQuickCreationDraft, quickCreationRequest } from "./quick-create.js";

describe("quick idea draft", () => {
  it("keeps a stable request id and maps existing resource types", () => {
    const requestId = crypto.randomUUID();
    const rhyme = buildQuickCreationDraft("rhyme_note", "  first line\r\nsecond  ", requestId);
    expect(rhyme).toMatchObject({ requestId, title: "first line", body: "first line\nsecond" });
    expect(quickCreationRequest(rhyme)).toMatchObject({ path: "/api/rhymes", body: { requestId, body: "first line\nsecond" } });
    const prompt = buildQuickCreationDraft("prompt", "ambient, female vocal\n808 bass, AMBIENT", requestId);
    expect(quickCreationRequest(prompt)).toMatchObject({ path: "/api/prompts", body: { requestId, tokens: ["ambient", "female vocal", "808 bass"] } });
  });

  it("rejects empty and invalid oversized prompt expressions", () => {
    expect(() => buildQuickCreationDraft("rhyme_note", "  ")).toThrow("QUICK_IDEA_EMPTY");
    expect(() => buildQuickCreationDraft("prompt", "x".repeat(201))).toThrow("QUICK_IDEA_TOO_LONG");
  });
});
