import { describe, expect, it } from "vitest";
import { promptCopyView } from "./prompt-copy.js";

describe("prompt copy UI projection", () => {
  it("uses the unchanged final payload for every boundary", () => {
    for (const count of [999, 1_000, 1_001]) {
      const text = "🙂".repeat(count);
      const view = promptCopyView(text);
      expect(view.text).toBe(text);
      expect(view.codePointCount).toBe(count);
      expect(Boolean(view.warningMessage)).toBe(count > 1_000);
    }
  });

  it("adds guidance without hiding successful copy feedback", () => {
    const view = promptCopyView("x".repeat(1_001));
    expect(view.feedback("복사했습니다.")).toContain("복사했습니다.");
    expect(view.feedback("복사했습니다.")).toContain("1,001자");
  });
});
