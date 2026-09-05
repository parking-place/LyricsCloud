"use client";

import {
  createCodeMirrorTextEditor,
  parseSongForm,
  SerializedSaveController,
  type CodeMirrorTextEditor,
  type SaveState,
  type SongFormNavigationState,
  type SongFormSection
} from "@lyricscloud/editor";
import type { LyricRecord } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";

export function LyricEditor({ initialLyric, songTitle }: { initialLyric: LyricRecord; songTitle: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorTextEditor | null>(null);
  const controllerRef = useRef<SerializedSaveController | null>(null);
  const titleRef = useRef(initialLyric.title);
  const bodyRef = useRef(initialLyric.body);
  const titleComposingRef = useRef(false);
  const [title, setTitle] = useState(initialLyric.title);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [songForm, setSongForm] = useState<SongFormNavigationState>({ sections: parseSongForm(initialLyric.body), activeSectionId: null });
  const [mobileSongFormOpen, setMobileSongFormOpen] = useState(false);

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
      onCompositionEnd() { controller.compositionEnd(); },
      onSongFormNavigationChange: setSongForm
    });
    editorRef.current = editor;
    const flush = () => { void controller.flush(); };
    window.addEventListener("pagehide", flush);
    const focusFrame = requestAnimationFrame(() => editor.focus());
    return () => {
      active = false;
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("pagehide", flush);
      editor.destroy();
      if (editorRef.current === editor) editorRef.current = null;
      void controller.dispose();
      controllerRef.current = null;
    };
  }, [initialLyric.body, initialLyric.id, initialLyric.rowVersion, initialLyric.title]);

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    controllerRef.current?.change({ title: value, body: bodyRef.current }, { composing: titleComposingRef.current });
  }

  function goToSection(sectionId: string) {
    editorRef.current?.goToSongFormSection(sectionId);
    setMobileSongFormOpen(false);
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
    <div className="lyric-editor-workspace">
      <aside className="songform-outline" aria-label="송폼 목차">
        <div className="songform-heading"><strong>송폼</strong><span>{songForm.sections.length}</span></div>
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} onSelect={goToSection} />
      </aside>
      <div className="lyric-editor-document">
        <div className="lyric-editor-surface" data-lyric-id={initialLyric.id} ref={mountRef} />
        <footer className="lyric-editor-footer">
          <span>순수 텍스트 · 최대 100,000자</span>
          <span>자동 저장 · 약 1초</span>
        </footer>
      </div>
    </div>
    <button type="button" className="mobile-songform-trigger" aria-haspopup="dialog" aria-expanded={mobileSongFormOpen}
      onClick={() => setMobileSongFormOpen(true)}>☷ 송폼 <span>{songForm.sections.length}</span></button>
    {mobileSongFormOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) setMobileSongFormOpen(false);
    }}>
      <section className="songform-sheet" role="dialog" aria-modal="true" aria-labelledby="songform-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header><h2 id="songform-sheet-title">송폼 이동</h2><button type="button" onClick={() => setMobileSongFormOpen(false)}>닫기</button></header>
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} onSelect={goToSection} />
      </section>
    </div> : null}
  </section>;
}

function SongFormList({ sections, activeSectionId, onSelect }: {
  sections: readonly SongFormSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  if (sections.length === 0) return <p className="songform-empty">`[Verse]`처럼 한 줄에 태그를 입력하면 목차가 생깁니다.</p>;
  return <nav className="songform-list" aria-label="인식된 송폼 구간">
    {sections.map((section) => <button key={section.id} type="button" className={section.id === activeSectionId ? "active" : ""}
      aria-current={section.id === activeSectionId ? "location" : undefined}
      aria-label={`${section.label}${section.occurrence > 1 ? ` ${section.occurrence}번째` : ""} 구간으로 이동`}
      onClick={() => onSelect(section.id)}>
      <span>{section.label}</span>{section.occurrence > 1 ? <small>#{section.occurrence}</small> : null}
    </button>)}
  </nav>;
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : state.lastSavedAt ? "방금 저장됨" : "서버에 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{label}
    {state.status === "error" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}
  </div>;
}
