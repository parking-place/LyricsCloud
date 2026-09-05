import { describe, expect, it } from "vitest";
import { normalizeLineEndings } from "./codemirror.js";

describe("CodeMirror plain text boundary", () => {
  it("normalizes clipboard and initial CRLF without interpreting HTML", () => {
    expect(normalizeLineEndings("[Verse]\r\n<b>텍스트</b>\r끝")).toBe("[Verse]\n<b>텍스트</b>\n끝");
  });
});
