import { describe, expect, it } from "vitest";
import { lyricCopyView } from "./lyric-copy.js";

describe("lyric copy view", () => {
  it.each([2_999, 3_000, 3_001])("uses the final payload at the %i code point boundary", (count) => {
    const view = lyricCopyView("가".repeat(count));
    expect(view.codePointCount).toBe(count);
    expect(Boolean(view.warningMessage)).toBe(count > 3_000);
    expect(view.feedback("복사 완료")).toContain("복사 완료");
  });

  it("normalizes line endings before counting and preserves Unicode code points", () => {
    expect(lyricCopyView("🙂\r\ne\u0301")).toMatchObject({
      payload: "🙂\ne\u0301", codePointCount: 4, exceedsRecommendedLimit: false, warningMessage: null
    });
  });
});
