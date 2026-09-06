import { describe, expect, it } from "vitest";
import {
  findPromptDuplicates, normalizePromptToken, parseCreatePromptInput, parsePromptText,
  projectUniquePromptTokens, PROMPT_LIMITS, PromptValidationError, serializePromptTokens
} from "./prompt-contract.js";

describe("prompt comma contract", () => {
  it("parses Korean, Latin, numbers, emoji, extra space, consecutive commas and empty fields", () => {
    const tokens = parsePromptText("  몽환적  , HyperPop, 808 bass,🙂 bright  synth,, ,끝,");
    expect(tokens).toEqual([
      { displayValue: "몽환적", normalizedValue: "몽환적" },
      { displayValue: "HyperPop", normalizedValue: "hyperpop" },
      { displayValue: "808 bass", normalizedValue: "808 bass" },
      { displayValue: "🙂 bright  synth", normalizedValue: "🙂 bright synth" },
      { displayValue: "끝", normalizedValue: "끝" }
    ]);
    expect(serializePromptTokens(tokens)).toBe("몽환적, HyperPop, 808 bass, 🙂 bright  synth, 끝");
  });

  it("always treats a comma as a delimiter and never creates an empty token", () => {
    expect(parsePromptText("a,b,,,c").map((token) => token.displayValue)).toEqual(["a", "b", "c"]);
  });

  it("accepts a bulk paste containing one hundred commas within the sequence limit", () => {
    const source = Array.from({ length: 101 }, (_, index) => `token ${index}`).join(",");
    expect(parsePromptText(source)).toHaveLength(101);
  });
});

describe("prompt duplicate comparison", () => {
  it("preserves display values while normalizing Unicode compatibility, case and whitespace", () => {
    const values = ["Ｆｅｍａｌｅ   Vocal", "female vocal"].map(normalizePromptToken);
    expect(values[0]?.displayValue).toBe("Ｆｅｍａｌｅ   Vocal");
    expect(values[0]?.normalizedValue).toBe("female vocal");
    expect(findPromptDuplicates(values)).toEqual([{ normalizedValue: "female vocal", firstIndex: 0, duplicateIndexes: [1] }]);
    expect(projectUniquePromptTokens(values)).toEqual([values[0]]);
  });
});

it("enforces title, token and sequence limits", () => {
  expect(() => normalizePromptToken("x".repeat(PROMPT_LIMITS.token + 1))).toThrow(PromptValidationError);
  expect(() => parseCreatePromptInput({
    requestId: "00000000-0000-4000-8000-000000000001", title: "x",
    tokens: Array.from({ length: PROMPT_LIMITS.tokensPerPrompt + 1 }, () => "tag")
  })).toThrow(PromptValidationError);
});
