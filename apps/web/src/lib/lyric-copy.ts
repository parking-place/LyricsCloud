import { buildLyricCopyPayload, type LyricCopyPayload } from "@lyricscloud/editor";

export interface LyricCopyView extends LyricCopyPayload {
  readonly warningMessage: string | null;
  feedback(successMessage: string): string;
}

/** Keeps automatic, shortcut, recovery, and manual lyric copy on one final payload. */
export function lyricCopyView(document: string): LyricCopyView {
  const payload = buildLyricCopyPayload(document);
  const warningMessage = payload.exceedsRecommendedLimit
    ? `${payload.codePointCount.toLocaleString("ko-KR")}자로 3,000자 권장 기준을 넘었습니다. 내용은 줄이지 않고 그대로 복사합니다.`
    : null;
  return {
    ...payload,
    warningMessage,
    feedback(successMessage) { return warningMessage ? `${successMessage} ${warningMessage}` : successMessage; }
  };
}
