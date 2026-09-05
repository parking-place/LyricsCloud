"use client";

import { createCodeMirrorTextEditor, SerializedSaveController, type SaveState } from "@lyricscloud/editor";
import type { LyricRecord } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";

export function LyricEditor({ initialLyric, songTitle }: { initialLyric: LyricRecord; songTitle: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SerializedSaveController | null>(null);
  const titleRef = useRef(initialLyric.title);
  const bodyRef = useRef(initialLyric.body);
  const titleComposingRef = useRef(false);
  const [title, setTitle] = useState(initialLyric.title);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    let active = true;
    const controller = new SerializedSaveController({
      initialDraft: { title: initialLyric.title, body: initialLyric.body },
      initialRowVersion: initialLyric.rowVersion,
      async save(draft, rowVersion) {
        const payload = JSON.stringify({ rowVersion, title: draft.title, body: draft.body });
        const response = await fetch(`/api/lyrics/${initialLyric.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
          cache: "no-store",
          keepalive: new TextEncoder().encode(payload).byteLength <= 60_000
        });
        if (!response.ok) throw new Error(response.status === 409 ? "VERSION_CONFLICT" : "SAVE_FAILED");
        const result = await response.json() as { lyric: LyricRecord };
        return { rowVersion: result.lyric.rowVersion };
      },
      onStateChange(state) { if (active) setSaveState(state); }
    });
    controllerRef.current = controller;
    const editor = createCodeMirrorTextEditor({
      parent,
      initialValue: initialLyric.body,
      ariaLabel: "가사 본문",
      onChange(value, context) {
        bodyRef.current = value;
        controller.change({ title: titleRef.current, body: value }, context);
      },
      onCompositionEnd() { controller.compositionEnd(); }
    });
    const flush = () => { void controller.flush(); };
    window.addEventListener("pagehide", flush);
    const focusFrame = requestAnimationFrame(() => editor.focus());
    return () => {
      active = false;
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("pagehide", flush);
      editor.destroy();
      void controller.dispose();
      controllerRef.current = null;
    };
  }, [initialLyric.body, initialLyric.id, initialLyric.rowVersion, initialLyric.title]);

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    controllerRef.current?.change({ title: value, body: bodyRef.current }, { composing: titleComposingRef.current });
  }

  return <section className="lyric-editor-page" aria-labelledby="lyric-title-label">
    <header className="lyric-editor-header">
      <div className="lyric-editor-context">
        <a href={`/songs/${initialLyric.songId}`} className="back-inline">← {songTitle}</a>
        <p className="eyebrow">Lyrics editor · single session</p>
      </div>
      <SaveIndicator state={saveState} onRetry={() => { void controllerRef.current?.retry(); }} />
    </header>
    <div className="lyric-editor-title">
      <label id="lyric-title-label" htmlFor="lyric-title">가사 제목</label>
      <input id="lyric-title" value={title} aria-invalid={!title.trim()} onChange={(event) => changeTitle(event.target.value)}
        onCompositionStart={() => { titleComposingRef.current = true; }}
        onCompositionEnd={() => { titleComposingRef.current = false; controllerRef.current?.compositionEnd(); }} />
      {!title.trim() ? <span role="alert">제목을 입력해야 저장할 수 있습니다.</span> : null}
    </div>
    <div className="lyric-editor-surface" data-lyric-id={initialLyric.id} ref={mountRef} />
    <footer className="lyric-editor-footer">
      <span>순수 텍스트 · 최대 100,000자</span>
      <span>자동 저장 · 약 1초</span>
    </footer>
  </section>;
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : state.lastSavedAt ? "방금 저장됨" : "서버에 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{label}
    {state.status === "error" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}
  </div>;
}
