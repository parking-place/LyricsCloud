"use client";

import {
  copySongFormSections,
  createBrowserLyricSync,
  copyWholeLyric,
  createCodeMirrorTextEditor,
  parseSongForm,
  SerializedSaveController,
  type CodeMirrorTextEditor,
  type BrowserLyricSync,
  type LocalSyncState,
  type SaveState,
  type SongFormNavigationState,
  type SongFormSection
} from "@lyricscloud/editor";
import { LYRIC_STATUSES, LYRIC_STATUS_LABELS, type LyricRecord, type LyricStatus } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createLyricMetadataSaver } from "../lib/lyric-metadata.js";
import { LyricHistory } from "./lyric-history.js";

interface LyricEditorDraft {
  readonly title: string;
  readonly memo: string;
  readonly status: LyricStatus;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
}

export function LyricEditor({ ownerId, initialLyric, songTitle, songLyrics }: { ownerId: string; initialLyric: LyricRecord; songTitle: string; songLyrics: readonly LyricRecord[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorTextEditor | null>(null);
  const controllerRef = useRef<SerializedSaveController<LyricEditorDraft> | null>(null);
  const localSyncRef = useRef<BrowserLyricSync | null>(null);
  const titleRef = useRef(initialLyric.title);
  const bodyRef = useRef(initialLyric.body);
  const memoRef = useRef(initialLyric.memo);
  const statusRef = useRef(initialLyric.status);
  const favoriteRef = useRef(initialLyric.isFavorite);
  const pinnedRef = useRef(initialLyric.isPinned);
  const pinOrderRef = useRef(initialLyric.pinOrder);
  const titleComposingRef = useRef(false);
  const memoComposingRef = useRef(false);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [title, setTitle] = useState(initialLyric.title);
  const [memo, setMemo] = useState(initialLyric.memo);
  const [status, setStatus] = useState(initialLyric.status);
  const [isFavorite, setIsFavorite] = useState(initialLyric.isFavorite);
  const [isPinned, setIsPinned] = useState(initialLyric.isPinned);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [localSyncState, setLocalSyncState] = useState<LocalSyncState>("loading");
  const [legacyConflict, setLegacyConflict] = useState<{ localBody: string; serverBody: string } | null>(null);
  const [songForm, setSongForm] = useState<SongFormNavigationState>({ sections: parseSongForm(initialLyric.body), activeSectionId: null });
  const [mobileSongFormOpen, setMobileSongFormOpen] = useState(false);
  const [mobileOtherLyricsOpen, setMobileOtherLyricsOpen] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(() => new Set());
  const [focusMode, setFocusMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<{ text: string; target: string } | null>(null);
  const [commandNotice, setCommandNotice] = useState("");
  const [commandBusy, setCommandBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const router = useRouter();

  function draft(overrides: Partial<LyricEditorDraft> = {}): LyricEditorDraft {
    return {
      title: titleRef.current, memo: memoRef.current, status: statusRef.current,
      isFavorite: favoriteRef.current, isPinned: pinnedRef.current, pinOrder: pinOrderRef.current,
      ...overrides
    };
  }

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    let active = true;
    const controller = new SerializedSaveController<LyricEditorDraft>({
      initialDraft: {
        title: initialLyric.title, memo: initialLyric.memo, status: initialLyric.status,
        isFavorite: initialLyric.isFavorite, isPinned: initialLyric.isPinned, pinOrder: initialLyric.pinOrder
      },
      initialRowVersion: initialLyric.rowVersion,
      save: createLyricMetadataSaver(initialLyric.id, initialLyric),
      onStateChange(state) { if (active) setSaveState(state); }
    });
    controllerRef.current = controller;
    const editor = createCodeMirrorTextEditor({
      parent,
      initialValue: initialLyric.body,
      ariaLabel: "가사 본문",
      readOnly: true,
      onChange(value) {
        bodyRef.current = value;
      },
      onCompositionStart() { localSyncRef.current?.setComposing(true); },
      onCompositionEnd() { localSyncRef.current?.setComposing(false); },
      async beforeLargePaste() {
        const saved = await localSyncRef.current?.checkpoint("large_paste") ?? false;
        if (active) setCommandNotice(saved ? "" : "붙여넣기 전 수정 기록을 저장하지 못했습니다. 연결을 확인한 뒤 다시 붙여넣어 주세요.");
        return saved;
      },
      onSongFormNavigationChange: setSongForm,
      onTransaction(transaction) { localSyncRef.current?.applyLocalTransaction(transaction); }
    });
    editorRef.current = editor;
    void createBrowserLyricSync({ ownerId, resourceId: initialLyric.id, initialBody: initialLyric.body,
      onRemoteBody(value, changes) {
        if (!active || value === bodyRef.current) return;
        const currentLength = editorRef.current?.value.length ?? 0;
        bodyRef.current = value;
        editorRef.current?.applyTransaction({ changes: changes ?? [{ from: 0, to: currentLength, insert: value }] });
      }, onEditableChange(editable) { if (active) editor.setEditable(editable); },
      onLegacyConflict(conflict) { if (active) setLegacyConflict(conflict); },
      onStateChange(state) { if (active) setLocalSyncState(state); }
    }).then((sync) => { if (active) localSyncRef.current = sync; else void sync.destroy(); })
      .catch(() => { if (active) setLocalSyncState("error"); });
    const flush = () => { void controller.flush(); localSyncRef.current?.leave(); };
    window.addEventListener("pagehide", flush);
    const focusFrame = requestAnimationFrame(() => editor.focus());
    return () => {
      active = false;
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("pagehide", flush);
      editor.destroy();
      localSyncRef.current?.leave();
      void localSyncRef.current?.destroy();
      localSyncRef.current = null;
      if (editorRef.current === editor) editorRef.current = null;
      void controller.dispose();
      controllerRef.current = null;
    };
  }, [initialLyric.body, initialLyric.id, initialLyric.isFavorite, initialLyric.isPinned, initialLyric.memo, initialLyric.pinOrder, initialLyric.rowVersion, initialLyric.status, initialLyric.title, ownerId]);

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
    controllerRef.current?.change(draft({ title: value }), { composing: titleComposingRef.current });
  }

  function changeMemo(value: string) {
    memoRef.current = value;
    setMemo(value);
    controllerRef.current?.change(draft({ memo: value }), { composing: memoComposingRef.current });
  }

  function changeStatus(value: LyricStatus) {
    statusRef.current = value;
    setStatus(value);
    controllerRef.current?.change(draft({ status: value }));
  }

  function toggleMetadata(field: "favorite" | "pinned") {
    if (field === "favorite") {
      const value = !favoriteRef.current;
      favoriteRef.current = value;
      setIsFavorite(value);
      controllerRef.current?.change(draft({ isFavorite: value }));
    } else {
      const value = !pinnedRef.current;
      pinnedRef.current = value;
      pinOrderRef.current = value ? 0 : null;
      setIsPinned(value);
      controllerRef.current?.change(draft({ isPinned: value, pinOrder: value ? 0 : null }));
    }
  }

  async function flushBeforeCommand(reason?: "leave" | "duplicate"): Promise<boolean> {
    await controllerRef.current?.flush();
    if (controllerRef.current?.state.status === "error" || !await localSyncRef.current?.flush()) {
      setCommandNotice("현재 변경 내용을 먼저 저장해야 합니다. 저장을 다시 시도해 주세요.");
      return false;
    }
    if (reason && !await localSyncRef.current?.checkpoint(reason)) {
      setCommandNotice("작업 전 수정 기록을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      return false;
    }
    return true;
  }

  async function openLyric(lyricId: string) {
    if (lyricId === initialLyric.id || commandBusy || !await flushBeforeCommand("leave")) return;
    setMobileOtherLyricsOpen(false);
    router.push(`/lyrics/${lyricId}`);
  }

  async function duplicateCurrent() {
    if (commandBusy || !await flushBeforeCommand("duplicate")) return;
    setCommandBusy(true);
    setCommandNotice("");
    try {
      const response = await fetch(`/api/lyrics/${initialLyric.id}/duplicate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID() })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { lyric: LyricRecord };
      router.push(`/lyrics/${result.lyric.id}`);
      router.refresh();
    } catch {
      setCommandBusy(false);
      setCommandNotice("가사를 복제하지 못했습니다. 현재 내용은 그대로 보존됩니다.");
    }
  }

  async function deleteCurrent() {
    if (commandBusy || !await flushBeforeCommand()) return;
    setCommandBusy(true);
    setCommandNotice("");
    try {
      const response = await fetch(`/api/lyrics/${initialLyric.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      const listResponse = await fetch(`/api/songs/${initialLyric.songId}/lyrics`, { cache: "no-store" });
      const currentLyrics = listResponse.ok ? (await listResponse.json() as { items: LyricRecord[] }).items : songLyrics;
      const next = currentLyrics.filter((lyric) => lyric.id !== initialLyric.id)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id))[0];
      router.replace(next ? `/lyrics/${next.id}` : `/songs/${initialLyric.songId}`);
      router.refresh();
    } catch {
      setCommandBusy(false);
      setDeleteOpen(false);
      setCommandNotice("가사를 삭제하지 못했습니다. 현재 화면을 유지합니다.");
    }
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
    setMobileOtherLyricsOpen(false);
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
        <a href={`/songs/${initialLyric.songId}`} className="back-inline" onClick={(event) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          void flushBeforeCommand("leave").then((saved) => { if (saved) router.push(`/songs/${initialLyric.songId}`); });
        }}>← {songTitle}</a>
        <p className="eyebrow">Lyrics editor</p>
      </div>
      <div className="editor-header-actions">
        <button type="button" onClick={() => setHistoryOpen(true)}>버전 비교</button>
        <button type="button" onClick={copyWhole} title="Alt+Shift+C" aria-keyshortcuts="Alt+Shift+C">전체 복사</button>
        <button type="button" aria-pressed={focusMode} onClick={toggleFocusMode} title="Alt+Shift+F" aria-keyshortcuts="Alt+Shift+F">{focusMode ? "집중 모드 종료" : "집중 모드"}</button>
        <button type="button" disabled={commandBusy} onClick={duplicateCurrent}>복제</button>
        <button type="button" disabled={commandBusy} className="danger-text" onClick={() => setDeleteOpen(true)}>삭제</button>
      </div>
      <SaveIndicator state={saveState} syncState={localSyncState} onRetry={() => { void controllerRef.current?.retry(); }} />
      <LocalDraftIndicator state={localSyncState} onRetry={() => localSyncRef.current?.retry()} />
    </header>
    {commandNotice ? <p className="editor-command-notice" role="status">{commandNotice}</p> : null}
    {legacyConflict ? <details className="editor-command-notice" open>
      <summary>이전 로컬 초안이 서버와 다릅니다. 두 내용을 보존하고 동기화를 멈췄습니다.</summary>
      <label>이전 로컬 초안<textarea readOnly value={legacyConflict.localBody} /></label>
      <label>서버 본문<textarea readOnly value={legacyConflict.serverBody} /></label>
      <button type="button" onClick={() => { void writeClipboard(legacyConflict.localBody, "이전 로컬 초안"); }}>이전 초안 복사</button>
    </details> : null}
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
          <span>본문 자동 동기화</span>
        </footer>
      </div>
      <aside className="other-lyrics-panel" aria-label="다른 가사">
        <LyricMetadataControls memo={memo} status={status} isFavorite={isFavorite} isPinned={isPinned}
          onMemo={changeMemo} onStatus={changeStatus} onFavorite={() => toggleMetadata("favorite")} onPinned={() => toggleMetadata("pinned")}
          onMemoCompositionStart={() => { memoComposingRef.current = true; }} onMemoCompositionEnd={() => { memoComposingRef.current = false; controllerRef.current?.compositionEnd(); }} />
        <OtherLyricsList lyrics={songLyrics} currentId={initialLyric.id} currentTitle={title} currentStatus={status} currentFavorite={isFavorite} onOpen={(id) => { void openLyric(id); }} />
      </aside>
    </div>
    <div className="mobile-editor-dock" role="group" aria-label="가사 편집 도구">
      <button type="button" aria-haspopup="dialog" aria-expanded={mobileSongFormOpen}
        onClick={() => setMobileSongFormOpen(true)}>☷ 송폼 <span>{songForm.sections.length}</span></button>
      <button type="button" onClick={copyWhole} aria-keyshortcuts="Alt+Shift+C">⧉ 전체 복사</button>
      <button type="button" aria-haspopup="dialog" aria-expanded={mobileOtherLyricsOpen} onClick={() => setMobileOtherLyricsOpen(true)}>≋ 다른 가사 <span>{songLyrics.length}</span></button>
      <button type="button" onClick={() => setHistoryOpen(true)}>기록·비교</button>
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
    {mobileOtherLyricsOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => {
      if (event.target === event.currentTarget) setMobileOtherLyricsOpen(false);
    }}><section className="songform-sheet other-lyrics-sheet" role="dialog" aria-modal="true" aria-labelledby="other-lyrics-sheet-title">
      <div className="sheet-handle" aria-hidden="true" />
      <header><div><h2 id="other-lyrics-sheet-title">다른 가사와 설정</h2><p>{songLyrics.length}개 가사</p></div><button type="button" onClick={() => setMobileOtherLyricsOpen(false)}>닫기</button></header>
      <div className="mobile-lyric-commands"><button type="button" disabled={commandBusy} onClick={duplicateCurrent}>현재 가사 복제</button><button type="button" disabled={commandBusy} className="danger-text" onClick={() => { setMobileOtherLyricsOpen(false); setDeleteOpen(true); }}>현재 가사 삭제</button></div>
      <LyricMetadataControls memo={memo} status={status} isFavorite={isFavorite} isPinned={isPinned}
        onMemo={changeMemo} onStatus={changeStatus} onFavorite={() => toggleMetadata("favorite")} onPinned={() => toggleMetadata("pinned")}
        onMemoCompositionStart={() => { memoComposingRef.current = true; }} onMemoCompositionEnd={() => { memoComposingRef.current = false; controllerRef.current?.compositionEnd(); }} />
      <OtherLyricsList lyrics={songLyrics} currentId={initialLyric.id} currentTitle={title} currentStatus={status} currentFavorite={isFavorite} onOpen={(id) => { void openLyric(id); }} />
    </section></div> : null}
    {historyOpen ? <LyricHistory lyricId={initialLyric.id} versions={songLyrics} onClose={() => setHistoryOpen(false)}
      readHistory={async () => {
        const sync = localSyncRef.current;
        if (!sync || !await sync.flush()) throw new Error("REVISION_UNAVAILABLE");
        return sync.listRevisions();
      }}
      readRevision={async (id) => {
        if (!localSyncRef.current) throw new Error("REVISION_UNAVAILABLE");
        return localSyncRef.current.getRevision(id);
      }}
      restore={async (id, input) => {
        if (!await flushBeforeCommand() || !localSyncRef.current) throw new Error("REVISION_UNAVAILABLE");
        await localSyncRef.current.restoreRevision(id, input);
      }} /> : null}
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
    {deleteOpen ? <div className="dialog-backdrop" role="presentation"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-delete-title" aria-describedby="editor-delete-description"><p className="eyebrow">Soft delete</p><h2 id="editor-delete-title">‘{title}’ 가사를 삭제할까요?</h2><p id="editor-delete-description">현재 가사를 숨긴 뒤 최근 다른 가사 또는 곡 대시보드로 이동합니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={commandBusy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-button" type="button" disabled={commandBusy} onClick={deleteCurrent}>{commandBusy ? "삭제 중…" : "가사 삭제 확인"}</button></div></section></div> : null}
  </section>;
}

function LyricMetadataControls({ memo, status, isFavorite, isPinned, onMemo, onStatus, onFavorite, onPinned, onMemoCompositionStart, onMemoCompositionEnd }: {
  memo: string;
  status: LyricStatus;
  isFavorite: boolean;
  isPinned: boolean;
  onMemo: (value: string) => void;
  onStatus: (value: LyricStatus) => void;
  onFavorite: () => void;
  onPinned: () => void;
  onMemoCompositionStart: () => void;
  onMemoCompositionEnd: () => void;
}) {
  return <section className="lyric-metadata" aria-label="가사 설정">
    <div className="other-panel-heading"><strong>가사 설정</strong></div>
    <label><span>상태</span><select value={status} onChange={(event) => onStatus(event.target.value as LyricStatus)}>{LYRIC_STATUSES.map((value) => <option key={value} value={value}>{LYRIC_STATUS_LABELS[value]}</option>)}</select></label>
    <div className="lyric-metadata-toggles"><button type="button" aria-pressed={isFavorite} onClick={onFavorite}>★ {isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button><button type="button" aria-pressed={isPinned} onClick={onPinned}>⌁ {isPinned ? "고정됨" : "고정"}</button></div>
    <label><span>작업 메모</span><textarea value={memo} maxLength={10_000} placeholder="다음 수정 방향을 기록하세요" onChange={(event) => onMemo(event.target.value)} onCompositionStart={onMemoCompositionStart} onCompositionEnd={onMemoCompositionEnd} /></label>
  </section>;
}

function OtherLyricsList({ lyrics, currentId, currentTitle, currentStatus, currentFavorite, onOpen }: {
  lyrics: readonly LyricRecord[];
  currentId: string;
  currentTitle: string;
  currentStatus: LyricStatus;
  currentFavorite: boolean;
  onOpen: (id: string) => void;
}) {
  const sorted = [...lyrics].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
  return <section className="other-lyrics-list" aria-label="다른 가사 목록">
    <div className="other-panel-heading"><strong>다른 가사</strong><span>{lyrics.length}</span></div>
    <div>{sorted.map((lyric) => {
      const current = lyric.id === currentId;
      return <button type="button" key={lyric.id} className={current ? "active" : ""} aria-current={current ? "page" : undefined} disabled={current}
        onClick={() => onOpen(lyric.id)}><span>{current ? currentTitle : lyric.title}</span><small>{current ? LYRIC_STATUS_LABELS[currentStatus] : LYRIC_STATUS_LABELS[lyric.status]} · {(current ? currentFavorite : lyric.isFavorite) ? "★" : formatShortDate(lyric.updatedAt)}</small></button>;
    })}</div>
  </section>;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
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

function SaveIndicator({ state, syncState, onRetry }: { state: SaveState; syncState: LocalSyncState; onRetry: () => void }) {
  if (state.status === "saved" && syncState !== "ready") return null;
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : "방금 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite">
    <span aria-hidden="true" />{label}
    {state.status === "error" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}
  </div>;
}

function LocalDraftIndicator({ state, onRetry }: { state: LocalSyncState; onRetry: () => void }) {
  if (state === "ready") return null;
  const labels: Record<Exclude<LocalSyncState, "ready">, string> = {
    loading: "초안과 서버 연결 확인 중…", "saving-local": "이 기기에 저장하는 중…",
    local: "이 기기에 임시 저장됨 · 서버 연결 대기", syncing: "이 기기에 임시 저장됨 · 서버 동기화 중…",
    projection: "서버에 저장됨 · 검색 반영 중…", offline: "오프라인 · 이 기기에 임시 저장됨",
    error: "동기화를 완료하지 못했습니다. 현재 입력을 복사해 보관해 주세요.",
    unavailable: "로그인 또는 문서 접근을 확인해 주세요. 현재 입력은 보존됩니다.",
    conflict: "초안을 자동으로 합칠 수 없어 동기화를 멈췄습니다."
  };
  return <p className={`local-draft-state state-${state}`} role="status">{labels[state]}
    {state === "error" || state === "local" ? <button type="button" onClick={onRetry}>동기화 다시 시도</button> : null}
  </p>;
}
