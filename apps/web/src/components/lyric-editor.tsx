"use client";

import {
  copySongFormSections,
  copyWholeLyric,
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
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [title, setTitle] = useState(initialLyric.title);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [songForm, setSongForm] = useState<SongFormNavigationState>({ sections: parseSongForm(initialLyric.body), activeSectionId: null });
  const [mobileSongFormOpen, setMobileSongFormOpen] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(() => new Set());
  const [focusMode, setFocusMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<{ text: string; target: string } | null>(null);

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

  useEffect(() => {
    const currentIds = new Set(songForm.sections.map((section) => section.id));
    setSelectedSectionIds((previous) => {
      const next = new Set([...previous].filter((id) => currentIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [songForm.sections]);

  useEffect(() => {
    if (!manualCopy) return;
    manualCopyRef.current?.focus();
    manualCopyRef.current?.select();
  }, [manualCopy]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  function changeTitle(value: string) {
    titleRef.current = value;
    setTitle(value);
    controllerRef.current?.change({ title: value, body: bodyRef.current }, { composing: titleComposingRef.current });
  }

  function goToSection(sectionId: string) {
    editorRef.current?.goToSongFormSection(sectionId);
    setMobileSongFormOpen(false);
  }

  function toggleSection(sectionId: string) {
    setSelectedSectionIds((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function showToast(message: string) {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3_000);
  }

  async function writeClipboard(text: string, target: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("CLIPBOARD_UNAVAILABLE");
      await navigator.clipboard.writeText(text);
      showToast(target === "가사 전체" ? "가사를 복사했습니다" : `${target}을 복사했습니다`);
    } catch {
      setManualCopy({ text, target });
    }
  }

  function copyWhole() {
    const text = copyWholeLyric(editorRef.current?.value ?? bodyRef.current);
    void writeClipboard(text, "가사 전체");
  }

  function copySelected() {
    const sections = editorRef.current?.songForm.sections ?? songForm.sections;
    const text = copySongFormSections(editorRef.current?.value ?? bodyRef.current, sections, selectedSectionIds);
    if (!text) return;
    const selected = sections.filter((section) => selectedSectionIds.has(section.id));
    const target = selected.length === 1
      ? `선택한 ${selected[0]!.label}${selected[0]!.occurrence > 1 ? ` ${selected[0]!.occurrence}번째` : ""} 구간`
      : `선택한 ${selected.length}개 구간`;
    void writeClipboard(text, target);
  }

  function toggleFocusMode() {
    setFocusMode((current) => !current);
    setMobileSongFormOpen(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && manualCopy) {
        setManualCopy(null);
        return;
      }
      if (event.isComposing || event.defaultPrevented || !event.altKey || !event.shiftKey) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        copyWhole();
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFocusMode();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <section className={`lyric-editor-page${focusMode ? " is-focus-mode" : ""}`} aria-labelledby="lyric-title-label">
    <header className="lyric-editor-header">
      <div className="lyric-editor-context">
        <a href={`/songs/${initialLyric.songId}`} className="back-inline">← {songTitle}</a>
        <p className="eyebrow">Lyrics editor · single session</p>
      </div>
      <div className="editor-header-actions">
        <button type="button" onClick={copyWhole} title="Alt+Shift+C" aria-keyshortcuts="Alt+Shift+C">전체 복사</button>
        <button type="button" aria-pressed={focusMode} onClick={toggleFocusMode} title="Alt+Shift+F" aria-keyshortcuts="Alt+Shift+F">{focusMode ? "집중 모드 종료" : "집중 모드"}</button>
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
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} selectedSectionIds={selectedSectionIds} onSelect={goToSection} onToggle={toggleSection} />
        <CopySelectionActions selectedCount={selectedSectionIds.size} onClear={() => setSelectedSectionIds(new Set())} onCopy={copySelected} />
      </aside>
      <div className="lyric-editor-document">
        <div className="lyric-editor-surface" data-lyric-id={initialLyric.id} ref={mountRef} />
        <footer className="lyric-editor-footer">
          <span>순수 텍스트 · 최대 100,000자</span>
          <span>자동 저장 · 약 1초</span>
        </footer>
      </div>
    </div>
    <div className="mobile-editor-dock" role="group" aria-label="가사 편집 도구">
      <button type="button" aria-haspopup="dialog" aria-expanded={mobileSongFormOpen}
        onClick={() => setMobileSongFormOpen(true)}>☷ 송폼 <span>{songForm.sections.length}</span></button>
      <button type="button" onClick={copyWhole} aria-keyshortcuts="Alt+Shift+C">⧉ 전체 복사</button>
      <button type="button" aria-pressed={focusMode} onClick={toggleFocusMode} aria-keyshortcuts="Alt+Shift+F">{focusMode ? "집중 종료" : "집중 모드"}</button>
    </div>
    {mobileSongFormOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) setMobileSongFormOpen(false);
    }}>
      <section className="songform-sheet" role="dialog" aria-modal="true" aria-labelledby="songform-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header><div><h2 id="songform-sheet-title">송폼 이동</h2><p>{selectedSectionIds.size}개 선택됨</p></div><button type="button" onClick={() => setMobileSongFormOpen(false)}>닫기</button></header>
        <SongFormList sections={songForm.sections} activeSectionId={songForm.activeSectionId} selectedSectionIds={selectedSectionIds} onSelect={goToSection} onToggle={toggleSection} />
        <CopySelectionActions selectedCount={selectedSectionIds.size} onClear={() => setSelectedSectionIds(new Set())} onCopy={copySelected} />
      </section>
    </div> : null}
    {toast ? <div className="copy-toast" role="status" aria-live="polite">{toast}</div> : null}
    {manualCopy ? <div className="dialog-backdrop" role="presentation" onPointerDown={(event) => {
      if (event.target === event.currentTarget) setManualCopy(null);
    }}><section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-copy-title" aria-describedby="manual-copy-description">
      <p className="eyebrow">Clipboard unavailable</p>
      <h2 id="manual-copy-title">{manualCopy.target}{manualCopy.target === "가사 전체" ? "를" : "을"} 직접 복사해 주세요</h2>
      <p id="manual-copy-description">브라우저가 클립보드 쓰기를 허용하지 않았습니다. 아래에는 같은 내용이 선택되어 있습니다.</p>
      <textarea ref={manualCopyRef} readOnly aria-label="수동 복사할 가사" value={manualCopy.text} />
      <button type="button" onClick={() => setManualCopy(null)}>닫기</button>
    </section></div> : null}
  </section>;
}

function SongFormList({ sections, activeSectionId, selectedSectionIds, onSelect, onToggle }: {
  sections: readonly SongFormSection[];
  activeSectionId: string | null;
  selectedSectionIds: ReadonlySet<string>;
  onSelect: (sectionId: string) => void;
  onToggle: (sectionId: string) => void;
}) {
  if (sections.length === 0) return <p className="songform-empty">`[Verse]`처럼 한 줄에 태그를 입력하면 목차가 생깁니다.</p>;
  return <nav className="songform-list" aria-label="인식된 송폼 구간">
    {sections.map((section) => {
      const name = `${section.label}${section.occurrence > 1 ? ` ${section.occurrence}번째` : ""}`;
      return <div className="songform-row" key={section.id}>
        <input type="checkbox" checked={selectedSectionIds.has(section.id)} aria-label={`${name} 구간 선택`}
          onChange={() => onToggle(section.id)} />
        <button type="button" className={section.id === activeSectionId ? "active" : ""}
          aria-current={section.id === activeSectionId ? "location" : undefined}
          aria-label={`${name} 구간으로 이동`}
          onClick={() => onSelect(section.id)}>
          <span>{section.label}</span>{section.occurrence > 1 ? <small>#{section.occurrence}</small> : null}
        </button>
      </div>;
    })}
  </nav>;
}

function CopySelectionActions({ selectedCount, onClear, onCopy }: { selectedCount: number; onClear: () => void; onCopy: () => void }) {
  return <div className="songform-copy-actions">
    <span aria-live="polite">{selectedCount}개 선택됨</span>
    <button type="button" onClick={onClear} disabled={selectedCount === 0}>선택 해제</button>
    <button type="button" className="primary" onClick={onCopy} disabled={selectedCount === 0}>선택 복사</button>
  </div>;
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : state.lastSavedAt ? "방금 저장됨" : "서버에 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{label}
    {state.status === "error" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}
  </div>;
}
