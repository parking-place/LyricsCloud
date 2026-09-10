import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { createLyricDocument, encodeTextRelativePosition, lyricBody, resolveTextRelativePosition } from "./crdt.js";
import { buildSongFormInsertion, DEFAULT_SONG_FORM_MARKERS } from "./songform-insertion.js";

describe("song-form insertion contract", () => {
  it("exposes one ordered default marker source and inserts an independent line", () => {
    expect(DEFAULT_SONG_FORM_MARKERS.map((item) => item.label)).toEqual([
      "Intro", "Verse", "Pre-Chorus", "Chorus", "Hook", "Bridge", "Outro"
    ]);
    expect(buildSongFormInsertion("첫 줄둘째 줄", 3, "Chorus")).toEqual({
      from: 3, to: 3, insert: "\n[Chorus]\n", selection: 13
    });
    expect(buildSongFormInsertion("첫 줄\n둘째 줄", 4, "Verse")).toEqual({
      from: 4, to: 4, insert: "[Verse]\n", selection: 12
    });
    expect(buildSongFormInsertion("", 0, "Intro")).toEqual({
      from: 0, to: 0, insert: "[Intro]", selection: 7
    });
  });

  it("resolves a captured caret after a remote prefix and undoes one insertion transaction", () => {
    const document = createLyricDocument("앞뒤");
    const text = lyricBody(document);
    const insertionOrigin = Symbol("songform-insertion");
    const undo = new Y.UndoManager(text, { trackedOrigins: new Set([insertionOrigin]) });
    const relative = encodeTextRelativePosition(document, 1);
    document.transact(() => text.insert(0, "원격 "), Symbol("remote"));
    const position = resolveTextRelativePosition(document, relative);
    expect(position).toBe(4);
    const change = buildSongFormInsertion(text.toString(), position!, "Bridge");
    document.transact(() => text.insert(change.from, change.insert), insertionOrigin);
    expect(text.toString()).toBe("원격 앞\n[Bridge]\n뒤");
    undo.undo();
    expect(text.toString()).toBe("원격 앞뒤");
    undo.destroy();
    document.destroy();
  });

  it("rejects stale positions and unknown markers without changing input", () => {
    expect(() => buildSongFormInsertion("원문", 3, "Verse")).toThrow("SONGFORM_INSERT_POSITION_INVALID");
    expect(() => buildSongFormInsertion("원문", 1, "Unknown" as "Verse")).toThrow("SONGFORM_MARKER_INVALID");
  });
});
