import { buildPromptCopyPayload, type PromptCopyPayload } from "@lyricscloud/domain";

export interface PromptCopyView extends PromptCopyPayload {
  readonly warningMessage: string | null;
  feedback(successMessage: string): string;
}

/** Keeps every prompt copy surface on the same payload/count/warning contract. */
export function promptCopyView(text: string): PromptCopyView {
  const payload = buildPromptCopyPayload(text);
  const warningMessage = payload.exceedsRecommendedLimit
    ? `${payload.codePointCount.toLocaleString("ko-KR")}자로 1,000자 권장 기준을 넘었습니다. 내용은 줄이지 않고 그대로 복사합니다.`
    : null;
  return {
    ...payload,
    warningMessage,
    feedback(successMessage) { return warningMessage ? `${successMessage} ${warningMessage}` : successMessage; }
  };
}
