import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { applyLyricUpdate, applyPromptUpdate, createLyricDocument, createPromptDocument, createRhymeDocument, encodeLyricSnapshot, encodePromptSnapshot, encodeTextRelativePosition, insertPromptToken, lyricBody, movePromptToken, projectLyric, projectPrompt, projectRhyme, resolveTextRelativePosition, rhymeBody } from "./crdt.js";

describe("lyric CRDT contract", () => {
  it("converges with reversed and duplicate delivery", () => {
    const baseline = createLyricDocument("[Verse]\n기준");
    const seed = encodeLyricSnapshot(baseline);
    const left = createLyricDocument(); const right = createLyricDocument();
    applyLyricUpdate(left, seed); applyLyricUpdate(right, seed);
    lyricBody(left).insert(0, "왼쪽\n");
    lyricBody(right).insert(lyricBody(right).length, "\n오른쪽");
    const leftUpdate = Y.encodeStateAsUpdate(left, Y.encodeStateVector(baseline));
    const rightUpdate = Y.encodeStateAsUpdate(right, Y.encodeStateVector(baseline));
    const first = createLyricDocument(); const second = createLyricDocument();
    applyLyricUpdate(first, seed); applyLyricUpdate(first, leftUpdate); applyLyricUpdate(first, rightUpdate); applyLyricUpdate(first, leftUpdate);
    applyLyricUpdate(second, seed); applyLyricUpdate(second, rightUpdate); applyLyricUpdate(second, leftUpdate);
    expect(projectLyric(first, "제목")).toEqual(projectLyric(second, "제목"));
    expect(projectLyric(first, "제목").body).toContain("왼쪽");
    expect(projectLyric(first, "제목").body).toContain("오른쪽");
  });

  it("recovers from a snapshot plus later updates and projects deterministically", () => {
    const source = createLyricDocument("한글\r\n🙂");
    const snapshot = encodeLyricSnapshot(source);
    lyricBody(source).insert(lyricBody(source).length, "\n[Hook]");
    const delta = Y.encodeStateAsUpdate(source, Y.encodeStateVector(createFrom(snapshot)));
    const recovered = createFrom(snapshot);
    applyLyricUpdate(recovered, delta);
    expect(projectLyric(recovered, "관계형 제목")).toEqual({ title: "관계형 제목", body: "한글\n🙂\n[Hook]" });
    expect(encodeLyricSnapshot(recovered)).toEqual(encodeLyricSnapshot(recovered));
  });
});

it("uses the same portable text document boundary for rhyme notes", () => {
  const document = createRhymeDocument("air\r\nchair");
  expect(rhymeBody(document).toString()).toBe("air\nchair");
  expect(projectRhyme(document, "라임")).toEqual({ title: "라임", body: "air\nchair" });
  document.destroy();
});

it("keeps a portable relative cursor attached across a concurrent prefix insertion", () => {
  const source = createLyricDocument("air chair");
  const relative = encodeTextRelativePosition(source, 4);
  const replica = createFrom(encodeLyricSnapshot(source));
  lyricBody(source).insert(0, "new ");
  applyLyricUpdate(replica, encodeLyricSnapshot(source));
  expect(resolveTextRelativePosition(replica, relative)).toBe(8);
  expect(resolveTextRelativePosition(replica, "not/base64")).toBeNull();
  source.destroy(); replica.destroy();
});

it("converges an ordered prompt sequence after concurrent insertions and movement", () => {
  const baseline = createPromptDocument("합성 프롬프트", [
    { occurrenceId: "base-a", displayValue: "ambient" },
    { occurrenceId: "base-b", displayValue: "female vocal" }
  ]);
  const seed = encodePromptSnapshot(baseline);
  const left = createPromptDocument(); const right = createPromptDocument();
  applyPromptUpdate(left, seed); applyPromptUpdate(right, seed);
  insertPromptToken(left, 1, { occurrenceId: "left-new", displayValue: "몽환적" });
  insertPromptToken(right, 2, { occurrenceId: "right-new", displayValue: "808 bass" });
  movePromptToken(left, "base-b", 0);
  const leftUpdate = Y.encodeStateAsUpdate(left, Y.encodeStateVector(baseline));
  const rightUpdate = Y.encodeStateAsUpdate(right, Y.encodeStateVector(baseline));
  applyPromptUpdate(left, rightUpdate); applyPromptUpdate(right, leftUpdate);
  expect(projectPrompt(left)).toEqual(projectPrompt(right));
  expect(projectPrompt(left).tokens.map((token) => token.displayValue).sort()).toEqual(["808 bass", "ambient", "female vocal", "몽환적"].sort());
  baseline.destroy(); left.destroy(); right.destroy();
});

it("keeps user duplicates in the CRDT draft while projecting a unique comma read model", () => {
  const document = createPromptDocument("중복", [
    { occurrenceId: "one", displayValue: "Ｆｅｍａｌｅ  Vocal" },
    { occurrenceId: "two", displayValue: "female vocal" },
    { occurrenceId: "three", displayValue: "bright synth" }
  ]);
  insertPromptToken(document, 3, { occurrenceId: "three", displayValue: "ignored retry" });
  const projection = projectPrompt(document);
  expect(projection.tokens).toHaveLength(3);
  expect(projection.duplicates).toEqual([{ normalizedValue: "female vocal", firstIndex: 0, duplicateIndexes: [1] }]);
  expect(projection.plainText).toBe("Ｆｅｍａｌｅ  Vocal, bright synth");
  document.destroy();
});

function createFrom(update: Uint8Array) {
  const document = createLyricDocument();
  applyLyricUpdate(document, update);
  return document;
}
