import type { WritingDisplaySettings, WritingFont } from "@lyricscloud/domain";
import type { CSSProperties } from "react";

export const NOTO_SANS_KR_FAMILY = "LyricsCloud Noto Sans KR";
export const NOTO_SANS_KR_ASSET_URL = "/fonts/NotoSansKR-Regular.69975a0a.otf";
export const NOTO_SANS_KR_LICENSE_URL = "/fonts/NotoSansKR-OFL-1.1.6a73f954.txt";
export const NOTO_SANS_KR_FALLBACK = `"${NOTO_SANS_KR_FAMILY}", "Noto Sans KR", Pretendard, system-ui, sans-serif`;

export const WRITING_FONT_OPTIONS: readonly { readonly value: WritingFont; readonly label: string }[] = [
  { value: "sans", label: "산세리프" },
  { value: "serif", label: "세리프" },
  { value: "mono", label: "고정폭" },
  { value: "noto_sans_kr", label: "Noto Sans KR" }
];

export function writingFontFamily(font: WritingFont): string {
  if (font === "noto_sans_kr") return NOTO_SANS_KR_FALLBACK;
  if (font === "serif") return 'Georgia, "Noto Serif KR", serif';
  if (font === "mono") return 'ui-monospace, "SFMono-Regular", Consolas, monospace';
  return 'Inter, Pretendard, "Noto Sans KR", system-ui, sans-serif';
}

export function writingDisplayStyle(settings: WritingDisplaySettings) {
  return {
    fontFamily: writingFontFamily(settings.font),
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}em`
  };
}

export function writingDisplayVariables(settings: WritingDisplaySettings): CSSProperties {
  return {
    "--lyric-font-family": writingFontFamily(settings.font),
    "--lyric-font-size": `${settings.fontSize}px`,
    "--lyric-line-height": String(settings.lineHeight),
    "--lyric-letter-spacing": `${settings.letterSpacing}em`
  } as CSSProperties;
}
