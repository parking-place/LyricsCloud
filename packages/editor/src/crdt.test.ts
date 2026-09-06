import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { applyLyricUpdate, createLyricDocument, createRhymeDocument, encodeLyricSnapshot, lyricBody, projectLyric, projectRhyme, rhymeBody } from "./crdt.js";

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

function createFrom(update: Uint8Array) {
  const document = createLyricDocument();
  applyLyricUpdate(document, update);
  return document;
}
