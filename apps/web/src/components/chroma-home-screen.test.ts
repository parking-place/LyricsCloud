import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChromaHomeScreen, type ChromaHomeData } from "./chroma-home-screen.js";

describe("1.2.0 Chroma home data states", () => {
  it("does not invent a count or saved work when owner queries fail", () => {
    const failed: ChromaHomeData = { songs: null, totalSongs: null, recent: null, saved: null };
    const html = renderToStaticMarkup(createElement(ChromaHomeScreen, { displayName: "합성 사용자", data: failed }));
    expect(html).toContain("곡 목록을 불러오지 못했습니다.");
    expect(html).toContain("최근 작업을 불러오지 못했습니다.");
    expect(html).toContain("즐겨찾기를 불러오지 못했습니다.");
    expect(html).not.toContain("나의 곡 0");
  });

  it("renders a genuine empty owner result with next actions", () => {
    const empty: ChromaHomeData = { songs: [], totalSongs: 0, recent: [], saved: [] };
    const html = renderToStaticMarkup(createElement(ChromaHomeScreen, { displayName: "합성 사용자", data: empty }));
    expect(html).toContain("나의 곡 0");
    expect(html).toContain("아직 곡이 없습니다.");
    expect(html).toContain("즐겨찾기한 자료가 없습니다.");
    expect(html).toContain("/songs/new");
  });
});
