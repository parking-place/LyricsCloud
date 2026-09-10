"use client";

import { useEffect, useRef, useState } from "react";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";

export interface CopyFeedbackState {
  readonly toast: string | null;
  readonly manual: { readonly text: string; readonly target: string; readonly warning: string | null } | null;
  copyText(text: string, target: string, successMessage: string, warning?: string | null): Promise<"copied" | "manual">;
  showToast(message: string): void;
  openManual(text: string, target: string, warning?: string | null): void;
  closeManual(): void;
}

export function useCopyFeedback(): CopyFeedbackState {
  const [toast, setToast] = useState<string | null>(null);
  const [manual, setManual] = useState<CopyFeedbackState["manual"]>(null);
  const timer = useRef<number | null>(null);
  function showToast(message: string) {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast(message);
    timer.current = window.setTimeout(() => setToast(null), 3_000);
  }
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return {
    toast,
    manual,
    async copyText(text, target, successMessage, warning = null) {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
        return "copied";
      } catch {
        setManual({ text, target, warning });
        return "manual";
      }
    },
    showToast,
    openManual(text, target, warning = null) { setManual({ text, target, warning }); },
    closeManual() { setManual(null); }
  };
}

export function CopyFeedback({ state, onManualComplete, dialogTitle, textareaLabel }: {
  state: CopyFeedbackState;
  onManualComplete?: () => void | Promise<void>;
  dialogTitle?: (target: string) => string;
  textareaLabel?: (target: string) => string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!state.manual) return;
    const frame = requestAnimationFrame(() => { area.current?.focus(); area.current?.select(); });
    return () => { cancelAnimationFrame(frame); };
  }, [state.manual]);
  return <>
    {state.toast ? <div className="copy-toast" role="status" aria-live="polite">{state.toast}</div> : null}
    {state.manual ? <div className="dialog-backdrop copy-dialog-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) state.closeManual(); }}>
      <section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="shared-copy-title" aria-describedby="shared-copy-description">
        <DialogFocusBoundary selector=".copy-dialog-backdrop .manual-copy-dialog" onClose={state.closeManual} initialFocus="textarea" />
        <p className="eyebrow">Clipboard fallback</p><h2 id="shared-copy-title">{dialogTitle?.(state.manual.target) ?? `직접 복사: ${state.manual.target}`}</h2>
        <p id="shared-copy-description">브라우저가 클립보드 쓰기를 허용하지 않았습니다. 아래 원문 전체가 선택되어 있으며 내용은 변경되지 않습니다.</p>
        {state.manual.warning ? <p className="copy-length-warning" role="status">{state.manual.warning}</p> : null}
        <textarea ref={area} readOnly aria-label={textareaLabel?.(state.manual.target) ?? `수동 복사할 ${state.manual.target}`} value={state.manual.text} />
        <div className="dialog-actions"><button type="button" onClick={state.closeManual}>{onManualComplete ? "취소" : "닫기"}</button>{onManualComplete ? <button type="button" className="primary-link" onClick={() => { void onManualComplete(); state.closeManual(); }}>복사 완료</button> : null}</div>
      </section>
    </div> : null}
  </>;
}
