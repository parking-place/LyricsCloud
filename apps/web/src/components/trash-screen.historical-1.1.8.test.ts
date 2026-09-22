import { describe, expect, it } from "vitest";
import type { TrashItem } from "@lyricscloud/domain";
import { impactText } from "./trash-screen.js";

describe("historical R10 trash impact", () => {
  const song: TrashItem = { kind: "resource", id: "song", type: "song", title: "삭제한 곡",
    originalLocation: "독립 자료", parentSongId: null, parentDeleted: false,
    deletedAt: "2026-09-22T00:00:00.000Z", purgeAt: "2026-10-22T00:00:00.000Z",
    affectedLyrics: 1, permanentlyDeletedLyrics: 2, preservedLinks: 1 };

  it("distinguishes batch restoration from irreversible removal including older lyrics", () => {
    expect(impactText([song], "restore")).toContain("같은 삭제 묶음의 소속 가사 1개");
    expect(impactText([song], "restore")).toContain("보존되는 연결 1개");
    const permanent = impactText([song], "permanent");
    expect(permanent).toContain("소속 가사 전체 2개 영구 삭제");
    expect(permanent).toContain("연결 1개 제거");
    expect(permanent).not.toContain("보존되는");
  });

  it("states link impacts per resource instead of double-counting a selected song-note link", () => {
    const note: TrashItem = { ...song, id: "note", title: "연결 노트", type: "rhyme_note",
      affectedLyrics: 0, permanentlyDeletedLyrics: 0 };
    const permanent = impactText([song, note], "permanent");
    expect(permanent).toContain("삭제한 곡: 소속 가사 전체 2개 영구 삭제 · 연결 1개 제거");
    expect(permanent).toContain("연결 노트: 연결 1개 제거");
    expect(permanent).not.toContain("연결 2개");
  });
});
