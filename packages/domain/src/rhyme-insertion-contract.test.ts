import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseRhymeInsertionRequest, RHYME_INSERTION_CONTRACT_VERSION, RhymeValidationError } from "./index.js";

const position = "AQABy_relative-position_01";

describe("rhyme to lyric insertion request", () => {
  it("keeps owner-derived resource/document references and exact plain text", () => {
    const parsed = parseRhymeInsertionRequest({
      version: RHYME_INSERTION_CONTRACT_VERSION,
      requestId: randomUUID(),
      source: { resourceId: randomUUID(), documentKey: randomUUID(), anchorRelativePosition: position, headRelativePosition: position },
      target: { resourceId: randomUUID(), documentKey: randomUUID(), relativePosition: position },
      text: "한글\r\n<script>text only</script> 🎵"
    });
    expect(parsed.text).toBe("한글\n<script>text only</script> 🎵");
  });

  it("rejects missing targets, opaque-position abuse, and empty or oversized payloads", () => {
    const valid = {
      version: 1, requestId: randomUUID(),
      source: { resourceId: randomUUID(), documentKey: randomUUID(), anchorRelativePosition: position, headRelativePosition: position },
      target: { resourceId: randomUUID(), documentKey: randomUUID(), relativePosition: position }, text: "air"
    };
    for (const value of [
      { ...valid, target: undefined },
      { ...valid, target: { ...valid.target, relativePosition: "not/base64" } },
      { ...valid, text: "" },
      { ...valid, text: "가".repeat(100_001) }
    ]) expect(() => parseRhymeInsertionRequest(value)).toThrow(RhymeValidationError);
  });
});
