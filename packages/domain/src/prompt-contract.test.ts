import { describe, expect, it } from "vitest";
import {
  buildPromptCopyPayload, findPromptDuplicates, normalizePromptToken, parseCreatePromptInput, parsePromptText,
  parsePromptListInput, parsePromptSongSearchInput, parsePromptSuggestionInput, parseUpdatePromptInput,
  projectUniquePromptTokens, PROMPT_COPY_WARNING_LIMIT, PROMPT_LIMITS, PromptValidationError, serializePromptContent,
  serializePromptTokens, splitPromptSentenceDisplay, validatePromptSentenceText
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

describe("prompt mode and raw sentence contract", () => {
  it("keeps the 1.0.2 tag payload and serializer as the default golden path", () => {
    const input = parseCreatePromptInput({ requestId: "00000000-0000-4000-8000-000000000001", title: "태그", tokens: ["Dream Pop", "Female Vocal"] });
    expect(input).toMatchObject({ mode: "tags", sentenceText: null });
    expect(serializePromptContent(input.mode, input.tokens, input.sentenceText)).toBe("Dream Pop, Female Vocal");
  });

  it("round-trips sentence punctuation, spaces and line endings without normalization", () => {
    const raw = "  cinematic, but not tags.\r\n두  칸과 🙂를 그대로  ";
    const input = parseCreatePromptInput({ requestId: "00000000-0000-4000-8000-000000000001", title: "문장", mode: "sentence", sentenceText: raw });
    expect(input).toMatchObject({ mode: "sentence", tokens: [], sentenceText: raw });
    expect(validatePromptSentenceText(raw)).toBe(raw);
    expect(serializePromptContent(input.mode, input.tokens, input.sentenceText)).toBe(raw);
  });

  it("requires mode-specific create payloads while allowing atomic conversion updates", () => {
    const base = { requestId: "00000000-0000-4000-8000-000000000001", title: "x" };
    expect(() => parseCreatePromptInput({ ...base, mode: "sentence", tokens: ["tag"], sentenceText: "raw" })).toThrow(PromptValidationError);
    expect(() => parseCreatePromptInput({ ...base, mode: "sentence" })).toThrow(PromptValidationError);
    expect(parseUpdatePromptInput({ requestId: base.requestId, rowVersion: 1, mode: "sentence", sentenceText: " a,b " }))
      .toMatchObject({ mode: "sentence", sentenceText: " a,b " });
  });
});

describe("1.0.4 sentence display and copy guidance", () => {
  it("splits only after U+002E and joins back to the exact raw source", () => {
    for (const raw of ["a.. b.", "3.5", "https://example.invalid/a.b", "끝 미완성", "한 줄.\r\n다음 🙂."]) {
      const spans = splitPromptSentenceDisplay(raw);
      expect(spans.map(({ text }) => text).join("")).toBe(raw);
      expect(spans.every(({ text, terminated }, index) => terminated === text.endsWith(".") && (index < spans.length - 1 || text.length > 0))).toBe(true);
    }
    expect(splitPromptSentenceDisplay("a.. b.").map(({ text }) => text)).toEqual(["a.", ".", " b."]);
    expect(splitPromptSentenceDisplay("")).toEqual([]);
  });

  it("counts final payload Unicode code points and warns only above 1,000", () => {
    expect(PROMPT_COPY_WARNING_LIMIT).toBe(1_000);
    for (const count of [999, 1_000, 1_001]) {
      expect(buildPromptCopyPayload("한".repeat(count))).toEqual({
        text: "한".repeat(count), codePointCount: count, exceedsRecommendedLimit: count > 1_000
      });
    }
  });

  it("keeps emoji, decomposed Hangul, spaces and CRLF byte-for-byte", () => {
    const raw = "🙂  가\r\n끝.";
    const result = buildPromptCopyPayload(raw);
    expect(result.text).toBe(raw);
    expect(result.codePointCount).toBe([...raw].length);
    expect(splitPromptSentenceDisplay(raw).map(({ text }) => text).join("")).toBe(raw);
  });

  it("processes the maximum prompt in linear time without changing it", () => {
    const raw = ".🙂\r\n".repeat(Math.floor(PROMPT_LIMITS.serialized / 4));
    const started = performance.now();
    let joined = "";
    for (let iteration = 0; iteration < 20; iteration += 1) {
      joined = splitPromptSentenceDisplay(raw).map(({ text }) => text).join("");
      buildPromptCopyPayload(raw);
    }
    expect(joined).toBe(raw);
    expect(performance.now() - started).toBeLessThan(2_000);
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

it("parses prompt list filters and rejects invalid URL state", () => {
  const song = "00000000-0000-4000-8000-000000000001";
  expect(parsePromptListInput(new URLSearchParams(`search= synth &song=${song}&favorite=true&recent=true&sort=recent_used&limit=12`)))
    .toEqual({ search: "synth", songId: song, favoriteOnly: true, recentlyUsedOnly: true, sort: "recent_used", limit: 12 });
  expect(parsePromptListInput(new URLSearchParams())).toEqual({ favoriteOnly: false, recentlyUsedOnly: false, sort: "favorite_first", limit: 20 });
  expect(() => parsePromptListInput(new URLSearchParams("recent=sometimes"))).toThrow(PromptValidationError);
  expect(() => parsePromptListInput(new URLSearchParams("sort=unknown"))).toThrow(PromptValidationError);
});

it("parses bounded suggestion search without requiring a token", () => {
  expect(parsePromptSuggestionInput(new URLSearchParams({ search: "  fem  ", limit: "8" }))).toEqual({ search: "fem", limit: 8 });
  expect(parsePromptSuggestionInput(new URLSearchParams())).toEqual({ search: "", limit: 20 });
  expect(() => parsePromptSuggestionInput(new URLSearchParams({ limit: "51" }))).toThrow(PromptValidationError);
});

it("parses bounded owner song candidate search", () => {
  expect(parsePromptSongSearchInput(new URLSearchParams({ search: "  연결 곡  ", limit: "8" }))).toEqual({ search: "연결 곡", limit: 8 });
  expect(parsePromptSongSearchInput(new URLSearchParams())).toEqual({ limit: 20 });
  expect(() => parsePromptSongSearchInput(new URLSearchParams({ search: "x".repeat(201) }))).toThrow(PromptValidationError);
  expect(() => parsePromptSongSearchInput(new URLSearchParams({ limit: "0" }))).toThrow(PromptValidationError);
});
