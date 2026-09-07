import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { capturePortableTextSelection } from "./cursor-insertion.js";
import { createLyricDocument, encodeLyricSnapshot, lyricBody, resolveTextRelativePosition } from "./crdt.js";

describe("portable rhyme selection", () => {
  it("captures exact whole and partial source positions from a server snapshot", () => {
    const document = createLyricDocument("air chair flare");
    const source = { resourceId: crypto.randomUUID(), documentKey: crypto.randomUUID(), body: "air chair flare",
      snapshot: Buffer.from(encodeLyricSnapshot(document)).toString("base64url") };
    const selected = capturePortableTextSelection(source, 4, 9)!;
    expect(resolveTextRelativePosition(document, selected.anchorRelativePosition)).toBe(4);
    expect(resolveTextRelativePosition(document, selected.headRelativePosition)).toBe(9);
    expect(capturePortableTextSelection({ ...source, body: "stale" }, 0, 5)).toBeNull();
    document.destroy();
  });

  it("keeps a captured target selection around concurrent edits", () => {
    const original = createLyricDocument("one TARGET two");
    const anchor = capture(original, 4); const head = capture(original, 10);
    lyricBody(original).insert(0, "remote ");
    expect(resolveTextRelativePosition(original, anchor)).toBe(11);
    expect(resolveTextRelativePosition(original, head)).toBe(17);
    original.destroy();
  });
});

function capture(document: Y.Doc, index: number) {
  return Buffer.from(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(lyricBody(document), index))).toString("base64url");
}
