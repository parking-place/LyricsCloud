import { describe, expect, it } from "vitest";
import { parseApplyTemplateInput, parseCreateTemplateInput, parseTemplateListInput, parseUpdateTemplateInput, TemplateValidationError } from "./template-contract.js";

const id = "11111111-1111-4111-8111-111111111111";

describe("template contract", () => {
  it("preserves lyric text and ordered unique prompt display tokens", () => {
    expect(parseCreateTemplateInput({ requestId: id, type: "lyrics", title: " 구조 ", lyricBody: "<b>[Hook]</b>\n그대로" })).toMatchObject({ title: "구조", lyricBody: "<b>[Hook]</b>\n그대로", promptMode: "tags", promptText: null, tokens: [] });
    expect(parseCreateTemplateInput({ requestId: id, type: "prompt", title: "태그", tokens: ["Dream Pop", "ＤＲＥＡＭ pop", "Female Vocal"] })).toMatchObject({ lyricBody: null, promptMode: "tags", promptText: null, tokens: [{ displayValue: "Dream Pop" }, { displayValue: "Female Vocal" }] });
    const raw = "  cinematic, with commas.\r\n한  문장  ";
    expect(parseCreateTemplateInput({ requestId: id, type: "prompt", title: "문장", promptMode: "sentence", promptText: raw }))
      .toMatchObject({ lyricBody: null, promptMode: "sentence", promptText: raw, tokens: [] });
  });

  it("rejects crossed payloads and crossed apply types", () => {
    expect(() => parseCreateTemplateInput({ requestId: id, type: "lyrics", title: "x", tokens: [] })).toThrow(TemplateValidationError);
    expect(() => parseUpdateTemplateInput({ rowVersion: 1, tokens: ["x"] }, "lyrics")).toThrow(TemplateValidationError);
    expect(() => parseApplyTemplateInput({ requestId: id, targetType: "lyrics", title: "x" })).toThrow(TemplateValidationError);
    expect(() => parseApplyTemplateInput({ requestId: id, targetType: "prompt", title: "x", songId: id })).toThrow(TemplateValidationError);
  });

  it("parses independent type and source filters", () => {
    expect(parseTemplateListInput(new URLSearchParams("type=prompt&source=default&sort=recent_used"))).toEqual({ type: "prompt", source: "default", sort: "recent_used" });
  });

  it("accepts empty and songform-only lyrics but rejects values beyond the maximum", () => {
    expect(parseCreateTemplateInput({ requestId: id, type: "lyrics", title: "빈 구조", lyricBody: "" }).lyricBody).toBe("");
    expect(parseCreateTemplateInput({ requestId: id, type: "lyrics", title: "태그만", lyricBody: "[Verse]\n[Hook]" }).lyricBody).toBe("[Verse]\n[Hook]");
    expect(() => parseCreateTemplateInput({ requestId: id, type: "lyrics", title: "초과", lyricBody: "가".repeat(100_001) })).toThrow(TemplateValidationError);
    expect(parseCreateTemplateInput({ requestId: id, type: "prompt", title: "빈 프롬프트", tokens: [] }).tokens).toEqual([]);
  });
});
