"use client";

import {
  createBrowserRhymeSync, createCodeMirrorTextEditor, SerializedSaveController,
  type BrowserRhymeSync, type CodeMirrorTextEditor, type LocalSyncState, type SaveState
} from "@lyricscloud/editor";
import { RESOURCE_COLORS, RHYME_LIMITS, parseUpdateRhymeNoteInput, type ResourceColor, type RhymeNoteRecord, type RhymeTagRecord, type WritingDisplaySettings } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";
import { createMetadataDraftStore, type MetadataDraft as MetadataRecoveryDraft } from "../lib/metadata-draft.js";
import { DialogFocusBoundary, trapDialogTab } from "../lib/dialog-focus.js";
import { createRhymeMetadataSaver } from "../lib/rhyme-metadata.js";
import { writingDisplayVariables } from "../lib/font-assets.js";
import { hasVolatilePendingInput } from "../lib/update-safety.js";
import { RhymeHistory } from "./rhyme-history.js";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";

interface MetadataDraft {
  readonly localRevision?: string;
  readonly title: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
}
interface SongCandidate { readonly id: string; readonly title: string; readonly isLinked: boolean }

const colorLabels: Record<ResourceColor, string> = { red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" };

export function RhymeEditor({ ownerId, initialRhyme, displaySettings, returnTo = "/rhymes" }: { ownerId: string; initialRhyme: RhymeNoteRecord; displaySettings: WritingDisplaySettings; returnTo?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorTextEditor | null>(null);
  const syncRef = useRef<BrowserRhymeSync | null>(null);
  const controllerRef = useRef<SerializedSaveController<MetadataDraft> | null>(null);
  const titleRef = useRef(initialRhyme.title);
  const metadataStoreRef = useRef<ReturnType<typeof createMetadataDraftStore> | null>(null);
  const metadataRevisionRef = useRef<string | undefined>(undefined);
  const commandLockRef = useRef(false);
  const bodyRef = useRef(initialRhyme.body);
  const favoriteRef = useRef(initialRhyme.isFavorite);
  const pinnedRef = useRef(initialRhyme.isPinned);
  const pinOrderRef = useRef(initialRhyme.pinOrder);
  const colorRef = useRef(initialRhyme.color);
  const titleComposingRef = useRef(false);
  const [title, setTitle] = useState(initialRhyme.title);
  const [metadataRecovery, setMetadataRecovery] = useState<MetadataRecoveryDraft[]>([]);
  const [metadataError, setMetadataError] = useState("");
  const [isFavorite, setIsFavorite] = useState(initialRhyme.isFavorite);
  const [isPinned, setIsPinned] = useState(initialRhyme.isPinned);
  const [color, setColor] = useState<ResourceColor | null>(initialRhyme.color);
  const [tags, setTags] = useState<readonly RhymeTagRecord[]>(initialRhyme.tags);
  const [tagInput, setTagInput] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [songCandidates, setSongCandidates] = useState<readonly SongCandidate[]>([]);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");
  const [songBusyId, setSongBusyId] = useState<string | null>(null);
  const [songRetryKey, setSongRetryKey] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [syncState, setSyncState] = useState<LocalSyncState>("loading");
  const [composingInput, setComposingInput] = useState(false);
  const [legacyConflict, setLegacyConflict] = useState<{ localBody: string; serverBody: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const copyFeedback = useCopyFeedback();
  const router = useRouter();
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const frame = requestAnimationFrame(() => settingsDialogRef.current?.querySelector<HTMLInputElement>("input")?.focus());
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setSettingsOpen(false); }
      else trapDialogTab(event, ".rhyme-settings-sheet");
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      requestAnimationFrame(() => settingsButtonRef.current?.focus());
    };
  }, [settingsOpen]);

  function draft(overrides: Partial<MetadataDraft> = {}): MetadataDraft {
    return { title: titleRef.current, isFavorite: favoriteRef.current, isPinned: pinnedRef.current,
      pinOrder: pinOrderRef.current, color: colorRef.current, localRevision: metadataRevisionRef.current, ...overrides };
  }

  function readRecoveryDraft() {
    return { resourceId: initialRhyme.id, title: titleRef.current, body: editorRef.current?.value ?? bodyRef.current };
  }

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    let active = true;
    let metadataStore: ReturnType<typeof createMetadataDraftStore> | null = null;
    try {
      metadataStore = createMetadataDraftStore(ownerId, "rhyme", initialRhyme.id);
      metadataStoreRef.current = metadataStore;
      setMetadataRecovery(metadataStore.read());
    } catch { setMetadataError("보관된 제목을 불러오지 못했습니다. 저장소 접근을 확인해 주세요."); }
    const saveMetadata = createRhymeMetadataSaver(initialRhyme.id, draft());
    const controller = new SerializedSaveController<MetadataDraft>({
      initialDraft: draft(), initialRowVersion: initialRhyme.rowVersion,
      async save(value, rowVersion) {
        parseUpdateRhymeNoteInput({ rowVersion, title: value.title });
        const result = await saveMetadata(value);
        try {
          if (value.localRevision) (metadataStore ??= createMetadataDraftStore(ownerId, "rhyme", initialRhyme.id)).acknowledge(value.localRevision);
        }
        catch { if (active) setMetadataError("서버 저장은 완료했지만 이 기기의 복구 초안을 정리하지 못했습니다."); }
        return result;
      },
      onStateChange(state) { if (active) setSaveState(state); }
    });
    controllerRef.current = controller;
    const editor = createCodeMirrorTextEditor({
      parent, initialValue: initialRhyme.body, ariaLabel: "라임 노트 본문", readOnly: true,
      onChange(value) { bodyRef.current = value; },
      onCompositionStart() { if (active) setComposingInput(true); syncRef.current?.setComposing(true); },
      onCompositionEnd() { if (active) setComposingInput(titleComposingRef.current); syncRef.current?.setComposing(false); },
      async beforeLargePaste() {
        const saved = await syncRef.current?.checkpoint("large_paste") ?? false;
        if (active) setNotice(saved ? "" : "붙여넣기 전 수정 기록을 저장하지 못했습니다. 연결을 확인해 주세요.");
        return saved;
      },
      onTransaction(transaction) { syncRef.current?.applyLocalTransaction(transaction); }
    });
    editorRef.current = editor;
    void createBrowserRhymeSync({ ownerId, resourceId: initialRhyme.id, initialBody: initialRhyme.body,
      onRemoteBody(value, changes) {
        if (!active || value === bodyRef.current) return;
        const length = editorRef.current?.value.length ?? 0;
        bodyRef.current = value;
        editorRef.current?.applyTransaction({ changes: changes ?? [{ from: 0, to: length, insert: value }] });
      },
      onEditableChange(editable) { if (active) editor.setEditable(editable); },
      onLegacyConflict(value) { if (active) setLegacyConflict(value); },
      onStateChange(state) { if (active) setSyncState(state); }
    }).then((sync) => { if (active) syncRef.current = sync; else void sync.destroy(); })
      .catch(() => { if (active) setSyncState("error"); });
    const leave = () => { editor.finishComposition(); void controller.flush(); syncRef.current?.leave(); };
    const unregisterLogout = registerLogoutSave(async () => {
      if (titleComposingRef.current) return false;
      await controller.flush();
      if (controller.state.status !== "saved") return false;
      return await syncRef.current?.checkpoint("leave") ?? false;
    }, readRecoveryDraft);
    window.addEventListener("pagehide", leave);
    const frame = requestAnimationFrame(() => editor.focus());
    return () => {
      active = false; cancelAnimationFrame(frame); window.removeEventListener("pagehide", leave); unregisterLogout();
      editor.destroy(); syncRef.current?.leave(); void syncRef.current?.destroy(); syncRef.current = null;
      if (editorRef.current === editor) editorRef.current = null;
      void controller.dispose(); controllerRef.current = null;
    };
  }, [initialRhyme.id, ownerId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSongLoading(true); setSongError("");
      const params = new URLSearchParams({ limit: "20" });
      if (songSearch.trim()) params.set("search", songSearch.trim());
      void fetch(`/api/rhymes/${initialRhyme.id}/songs?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return response.json() as Promise<{ items: readonly SongCandidate[] }>;
        })
        .then(({ items }) => setSongCandidates(items))
        .catch(() => { if (!controller.signal.aborted) setSongError("곡 목록을 불러오지 못했습니다."); })
        .finally(() => { if (!controller.signal.aborted) setSongLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [initialRhyme.id, songRetryKey, songSearch]);

  function restoreMetadata(saved: MetadataRecoveryDraft) {
    if (controllerRef.current?.state.status !== "saved" || titleComposingRef.current) return;
    try {
      const store = metadataStoreRef.current;
      if (!store) return;
      const revision = store.restore(saved);
      if (revision) {
        metadataRevisionRef.current = revision;
        titleRef.current = saved.title; setTitle(saved.title);
        controllerRef.current.change(draft());
      }
      setMetadataRecovery(store.read());
    } catch { setMetadataError("보관된 제목을 복원하지 못했습니다. 복구본을 복사해 보관해 주세요."); }
  }

  function discardMetadata(saved: MetadataRecoveryDraft) {
    try {
      metadataStoreRef.current?.acknowledge(saved.revision);
      setMetadataRecovery(metadataStoreRef.current?.read() ?? []);
    } catch { setMetadataError("보관된 제목을 정리하지 못했습니다."); }
  }

  function changeTitle(value: string) {
    titleRef.current = value; setTitle(value);
    try {
      const store = metadataStoreRef.current ??= createMetadataDraftStore(ownerId, "rhyme", initialRhyme.id);
      metadataRevisionRef.current = store.write({ title: value });
      setMetadataError("");
    } catch {
      metadataRevisionRef.current = undefined;
      setMetadataError("제목을 이 기기에 보관하지 못했습니다. 현재 입력을 복사하고 창을 닫지 마세요.");
    }
    controllerRef.current?.change(draft({ title: value }), { composing: titleComposingRef.current });
  }
  function toggleFavorite() {
    const value = !favoriteRef.current; favoriteRef.current = value; setIsFavorite(value);
    controllerRef.current?.change(draft({ isFavorite: value }));
  }
  function togglePinned() {
    const value = !pinnedRef.current; pinnedRef.current = value; pinOrderRef.current = value ? 0 : null; setIsPinned(value);
    controllerRef.current?.change(draft({ isPinned: value, pinOrder: value ? 0 : null }));
  }
  function changeColor(value: ResourceColor | null) {
    colorRef.current = value; setColor(value); controllerRef.current?.change(draft({ color: value }));
  }

  async function flushBeforeCommand(checkpoint?: boolean): Promise<boolean> {
    editorRef.current?.finishComposition();
    if (titleComposingRef.current || editorRef.current?.composing) {
      setNotice("글자 조합을 마친 뒤 다시 시도해 주세요."); return false;
    }
    await controllerRef.current?.flush();
    if (controllerRef.current?.state.status !== "saved" || !await syncRef.current?.flush()) {
      setNotice("현재 변경 내용을 먼저 저장해야 합니다. 저장과 동기화를 다시 시도해 주세요."); return false;
    }
    if (checkpoint && !await syncRef.current?.checkpoint("leave")) {
      setNotice("이동 전 수정 기록을 저장하지 못했습니다. 연결을 확인해 주세요."); return false;
    }
    if (controllerRef.current?.state.status !== "saved" || titleComposingRef.current || editorRef.current?.composing) {
      setNotice("새로 입력한 내용을 먼저 저장해야 합니다. 입력을 마친 뒤 다시 시도해 주세요."); return false;
    }
    return true;
  }

  async function goBack() {
    if (busy || !await flushBeforeCommand(true)) return;
    router.push(returnTo);
  }

  async function addTag(event: FormEvent) {
    event.preventDefault();
    if (tagBusy || !tagInput.trim()) return;
    setTagBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/rhymes/${initialRhyme.id}/tags`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: tagInput })
      });
      const result = await response.json() as { rhyme?: RhymeNoteRecord };
      if (!response.ok || !result.rhyme) throw new Error();
      setTags(result.rhyme.tags); setTagInput("");
    } catch { setNotice("태그를 추가하지 못했습니다. 기존 본문과 태그는 그대로 보존됩니다."); }
    finally { setTagBusy(false); }
  }

  async function removeTag(tag: RhymeTagRecord) {
    if (tagBusy) return;
    setTagBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/rhymes/${initialRhyme.id}/tags/${tag.id}`, { method: "DELETE" });
      const result = await response.json() as { removed?: boolean };
      if (!response.ok || !result.removed) throw new Error();
      setTags((current) => current.filter(({ id }) => id !== tag.id));
    } catch { setNotice(`‘${tag.displayValue}’ 태그를 제거하지 못했습니다.`); }
    finally { setTagBusy(false); }
  }

  async function toggleSong(candidate: SongCandidate) {
    if (songBusyId) return;
    setSongBusyId(candidate.id); setNotice("");
    try {
      const response = await fetch(`/api/rhymes/${initialRhyme.id}/songs/${candidate.id}`, { method: candidate.isLinked ? "DELETE" : "PUT" });
      if (!response.ok) throw new Error();
      setSongCandidates((items) => items.map((item) => item.id === candidate.id ? { ...item, isLinked: !candidate.isLinked } : item));
      setNotice(`‘${candidate.title}’ 곡 연결을 ${candidate.isLinked ? "해제" : "추가"}했습니다.`);
    } catch { setSongError("곡 연결을 변경하지 못했습니다. 다시 시도해 주세요."); }
    finally { setSongBusyId(null); }
  }

  async function openTagFilter(tag: RhymeTagRecord) {
    if (!await flushBeforeCommand(true)) return;
    router.push(`/rhymes?tag=${tag.id}`);
  }

  function copyBody() {
    void copyFeedback.copyText(editorRef.current?.value ?? bodyRef.current, "라임 노트", "라임 노트 전체를 복사했습니다");
  }

  function copyRecovery() {
    const { title, body } = readRecoveryDraft();
    void copyFeedback.copyText(JSON.stringify({ title, body }, null, 2), "라임 노트 복구본", "제목·원문을 포함한 복구본을 복사했습니다.");
  }

  function copySelection() {
    const editor = editorRef.current;
    if (!editor || editor.selection.from === editor.selection.to) {
      setNotice("복사할 본문 영역을 먼저 선택해 주세요.");
      return;
    }
    void copyFeedback.copyText(editor.value.slice(editor.selection.from, editor.selection.to), "선택한 라임 표현", "선택한 라임 표현을 복사했습니다");
  }

  async function deleteCurrent() {
    if (commandLockRef.current || busy) return;
    commandLockRef.current = true;
    setBusy(true); setNotice("");
    let navigating = false;
    try {
      if (!await flushBeforeCommand()) return;
      const response = await fetch(`/api/rhymes/${initialRhyme.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      router.replace(returnTo); router.refresh();
      navigating = true;
    } catch { setDeleteOpen(false); setNotice("라임 노트를 삭제하지 못했습니다. 현재 화면을 유지합니다."); }
    finally { if (!navigating) { commandLockRef.current = false; setBusy(false); } }
  }

  const titleLength = [...title.normalize("NFC").trim()].length;
  const titleError = !title.trim() ? "제목을 입력해야 저장할 수 있습니다." : titleLength > RHYME_LIMITS.title ? `제목은 ${RHYME_LIMITS.title}자 이하로 입력해 주세요.` : "";

  return <section className="rhyme-editor-page" aria-labelledby="rhyme-editor-heading" style={writingDisplayVariables(displaySettings)}
    data-pending-input={composingInput || Boolean(metadataError) || metadataRecovery.length > 0 || hasVolatilePendingInput(saveState.status, syncState) || undefined}>
    <h1 className="sr-only" id="rhyme-editor-heading">라임 노트 편집: {title || "제목 없음"}</h1>
    <header className="rhyme-editor-header">
      <div><button type="button" className="back-button" onClick={() => void goBack()}>← 라임 노트</button><p className="eyebrow">Rhyme editor</p></div>
      <div className="rhyme-editor-actions">
        <button type="button" onClick={() => setHistoryOpen(true)}>수정 기록</button>
        <button type="button" onClick={copyBody}>전체 복사</button>
        <button type="button" onClick={copySelection}>선택 복사</button>
        <button type="button" className="danger-text" disabled={busy} onClick={() => setDeleteOpen(true)}>삭제</button>
      </div>
      <div className="editor-save-strip" data-save-state={saveState.status} data-sync-state={syncState}>
        <SaveIndicator state={saveState} syncState={syncState} onRetry={() => void controllerRef.current?.retry()} onCopy={copyRecovery} />
        <LocalDraftIndicator state={syncState} onRetry={() => syncRef.current?.retry()} onCopy={copyRecovery} />
      </div>
    </header>
    {notice ? <p className="editor-command-notice" role="status">{notice}</p> : null}
    {metadataError ? <p className="editor-command-notice" role="alert">{metadataError} <button type="button" onClick={copyRecovery}>현재 입력 복사</button></p> : null}
    {metadataRecovery.map((saved) => <details key={saved.revision} className="editor-command-notice" open>
      <summary>서버에 저장되지 않은 제목이 이 기기에 있습니다. 확인 후 복원해 주세요.</summary>
      <label>보관된 제목<textarea readOnly value={saved.title} /></label>
      <button type="button" disabled={saveState.status !== "saved" || composingInput} onClick={() => restoreMetadata(saved)}>이 초안 복원</button>
      <button type="button" onClick={() => { void copyFeedback.copyText(JSON.stringify({ title: saved.title }, null, 2), "제목 복구본", "보관된 제목을 복사했습니다."); }}>이 초안 복사</button>
      <button type="button" onClick={() => discardMetadata(saved)}>이 초안 버리기</button>
      {saveState.status !== "saved" ? <p>현재 입력을 먼저 저장하거나 복사해 보관해 주세요.</p> : null}
    </details>)}
    {legacyConflict ? <details className="editor-command-notice" open><summary>이전 로컬 초안과 서버 본문을 자동으로 합칠 수 없어 동기화를 멈췄습니다.</summary>
      <label>이전 로컬 초안<textarea readOnly value={legacyConflict.localBody} /></label><label>서버 본문<textarea readOnly value={legacyConflict.serverBody} /></label>
    </details> : null}
    <div className="rhyme-editor-title"><label id="rhyme-title-label" htmlFor="rhyme-title">노트 제목</label>
      <input id="rhyme-title" value={title} aria-invalid={Boolean(titleError)} aria-describedby="rhyme-title-feedback" onChange={(event) => changeTitle(event.target.value)}
        onCompositionStart={() => { titleComposingRef.current = true; controllerRef.current?.compositionStart(); setComposingInput(true); }}
        onCompositionEnd={() => { titleComposingRef.current = false; setComposingInput(Boolean(editorRef.current?.composing)); controllerRef.current?.compositionEnd(); }} />
      <span id="rhyme-title-feedback" className={titleError ? "over" : ""}>{titleLength.toLocaleString()} / {RHYME_LIMITS.title}
        {titleError ? <small role="alert"> {titleError}</small> : null}</span>
    </div>
    <div className="rhyme-editor-workspace">
      <div className="rhyme-editor-document">
        <div className="rhyme-editor-surface" data-editor-surface="rhyme" data-rhyme-id={initialRhyme.id} ref={mountRef} />
        <footer><span>순수 텍스트 · 빈 본문 허용 · 최대 {RHYME_LIMITS.body.toLocaleString()}자</span><span>본문 자동 동기화</span></footer>
      </div>
      <aside className="rhyme-editor-side" aria-label="라임 노트 설정">
        <RhymeSettings idPrefix="desktop" tags={tags} tagInput={tagInput} tagBusy={tagBusy} isFavorite={isFavorite} isPinned={isPinned} color={color}
          onTagInput={setTagInput} onAddTag={addTag} onRemoveTag={(tag) => void removeTag(tag)}
          onTagFilter={(tag) => void openTagFilter(tag)} onFavorite={toggleFavorite} onPinned={togglePinned} onColor={changeColor}
          songSearch={songSearch} songCandidates={songCandidates} songLoading={songLoading} songError={songError} songBusyId={songBusyId}
          onSongSearch={setSongSearch} onSongToggle={(song) => void toggleSong(song)} onSongRetry={() => setSongRetryKey((value) => value + 1)} />
      </aside>
    </div>
    <div className="rhyme-mobile-dock" role="group" aria-label="라임 노트 편집 도구">
      <button type="button" onClick={copyBody}>⧉ 전체 복사</button>
      <button type="button" onClick={copySelection}>⌁ 선택 복사</button>
      <button type="button" onClick={() => setHistoryOpen(true)}>◴ 수정 기록</button>
      <button ref={settingsButtonRef} type="button" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>⚙ 태그·설정</button>
    </div>
    {settingsOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <section ref={settingsDialogRef} className="songform-sheet rhyme-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="rhyme-settings-title">
        <header><h2 id="rhyme-settings-title">태그와 표시 설정</h2><button type="button" onClick={() => setSettingsOpen(false)}>닫기</button></header>
        <RhymeSettings idPrefix="mobile" tags={tags} tagInput={tagInput} tagBusy={tagBusy} isFavorite={isFavorite} isPinned={isPinned} color={color}
          onTagInput={setTagInput} onAddTag={addTag} onRemoveTag={(tag) => void removeTag(tag)}
          onTagFilter={(tag) => void openTagFilter(tag)} onFavorite={toggleFavorite} onPinned={togglePinned} onColor={changeColor}
          songSearch={songSearch} songCandidates={songCandidates} songLoading={songLoading} songError={songError} songBusyId={songBusyId}
          onSongSearch={setSongSearch} onSongToggle={(song) => void toggleSong(song)} onSongRetry={() => setSongRetryKey((value) => value + 1)} />
        <button type="button" className="rhyme-sheet-delete danger-text" disabled={busy} onClick={() => { setSettingsOpen(false); setDeleteOpen(true); }}>라임 노트 삭제</button>
      </section>
    </div> : null}
    {historyOpen ? <RhymeHistory onClose={() => setHistoryOpen(false)}
      readHistory={async () => { const sync = syncRef.current; if (!sync || !await sync.flush()) throw new Error("REVISION_UNAVAILABLE"); return sync.listRevisions(); }}
      readRevision={async (id) => { if (!syncRef.current) throw new Error("REVISION_UNAVAILABLE"); return syncRef.current.getRevision(id); }}
      restore={async (id, input) => { if (!await flushBeforeCommand() || !syncRef.current) throw new Error("REVISION_UNAVAILABLE"); await syncRef.current.restoreRevision(id, input); }} /> : null}
    {deleteOpen ? <div className="dialog-backdrop"><section className="delete-dialog rhyme-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="rhyme-delete-title">
      <DialogFocusBoundary selector=".rhyme-delete-dialog" onClose={() => setDeleteOpen(false)} blocked={busy} />
      <p className="eyebrow">휴지통으로 이동</p><h2 id="rhyme-delete-title">‘{title}’ 라임 노트를 삭제할까요?</h2><p>노트는 휴지통으로 이동하며 태그와 곡 연결 원본은 보존됩니다.</p>
      <div><button type="button" className="secondary-button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button>
        <button type="button" className="danger-button" disabled={busy} onClick={() => void deleteCurrent()}>{busy ? "삭제 중…" : "라임 노트 삭제 확인"}</button></div>
    </section></div> : null}
    <CopyFeedback state={copyFeedback} dialogTitle={() => "직접 복사해 주세요"} textareaLabel={() => "수동 복사할 라임 노트"} />
  </section>;
}

function RhymeSettings(props: {
  idPrefix: string; tags: readonly RhymeTagRecord[]; tagInput: string; tagBusy: boolean; isFavorite: boolean; isPinned: boolean; color: ResourceColor | null;
  onTagInput(value: string): void; onAddTag(event: FormEvent): void; onRemoveTag(tag: RhymeTagRecord): void;
  onTagFilter(tag: RhymeTagRecord): void;
  onFavorite(): void; onPinned(): void; onColor(color: ResourceColor | null): void;
  songSearch: string; songCandidates: readonly SongCandidate[]; songLoading: boolean; songError: string; songBusyId: string | null;
  onSongSearch(value: string): void; onSongToggle(song: SongCandidate): void; onSongRetry(): void;
}) {
  return <div className="rhyme-settings">
    <section><div className="other-panel-heading"><strong>태그</strong><span>{props.tags.length} / {RHYME_LIMITS.tagsPerNote}</span></div>
      <form className="rhyme-tag-form" onSubmit={props.onAddTag}><label htmlFor={`${props.idPrefix}-rhyme-tag`}>새 태그</label><div><input id={`${props.idPrefix}-rhyme-tag`} value={props.tagInput} maxLength={RHYME_LIMITS.tag}
        placeholder="예: air, 펀치라인" onChange={(event) => props.onTagInput(event.target.value)} /><button type="submit" disabled={props.tagBusy || !props.tagInput.trim()}>추가</button></div></form>
      {props.tags.length ? <ul className="rhyme-editor-tags">{props.tags.map((tag) => <li key={tag.id}><button type="button" className="rhyme-tag-filter" onClick={() => props.onTagFilter(tag)}>#{tag.displayValue}</button><button type="button" disabled={props.tagBusy} aria-label={`${tag.displayValue} 태그 제거`} onClick={() => props.onRemoveTag(tag)}>×</button></li>)}</ul>
        : <p className="rhyme-setting-empty">아직 태그가 없습니다.</p>}
    </section>
    <section className="rhyme-song-links"><div className="other-panel-heading"><strong>연결 곡</strong><span>{props.songCandidates.filter(({ isLinked }) => isLinked).length}개</span></div>
      <label htmlFor={`${props.idPrefix}-rhyme-song-search`}>곡 검색</label>
      <input id={`${props.idPrefix}-rhyme-song-search`} type="search" value={props.songSearch} maxLength={200} placeholder="곡 제목 검색" onChange={(event) => props.onSongSearch(event.target.value)} />
      {props.songLoading ? <p role="status">곡 후보를 불러오는 중…</p> : null}
      {props.songError ? <p role="alert">{props.songError} <button type="button" onClick={props.onSongRetry}>다시 시도</button></p> : null}
      {!props.songLoading && !props.songError && !props.songCandidates.length ? <p className="rhyme-setting-empty">{props.songSearch.trim() ? "검색에 맞는 곡이 없습니다." : "연결할 수 있는 곡이 없습니다."}</p> : null}
      {!props.songLoading && !props.songError && props.songCandidates.length ? <ul>{props.songCandidates.map((song) => <li key={song.id}>
        <span>{song.title}</span><button type="button" aria-pressed={song.isLinked} disabled={props.songBusyId !== null}
          onClick={() => props.onSongToggle(song)}>{props.songBusyId === song.id ? "처리 중…" : song.isLinked ? "연결 해제" : "연결"}</button>
      </li>)}</ul> : null}
    </section>
    <section><div className="other-panel-heading"><strong>표시 설정</strong></div>
      <div className="rhyme-setting-toggles"><button type="button" aria-pressed={props.isFavorite} onClick={props.onFavorite}>★ {props.isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button>
        <button type="button" aria-pressed={props.isPinned} onClick={props.onPinned}>⌁ {props.isPinned ? "고정됨" : "고정"}</button></div>
      <fieldset className="rhyme-color-options"><legend>색상</legend><button type="button" aria-pressed={props.color === null} onClick={() => props.onColor(null)}>없음</button>
        {RESOURCE_COLORS.map((value) => <button type="button" key={value} className={`color-${value}`} aria-pressed={props.color === value} onClick={() => props.onColor(value)}><span aria-hidden="true" />{colorLabels[value]}</button>)}</fieldset>
    </section>
    <section className="rhyme-insertion-unavailable"><div className="other-panel-heading"><strong>가사에 삽입</strong></div>
      <button type="button" disabled aria-describedby={`${props.idPrefix}-rhyme-insertion-help`}>열린 가사에 삽입</button>
      <p id={`${props.idPrefix}-rhyme-insertion-help`}>현재 화면에는 열린 가사 편집 대상이 없습니다. 선택 복사로 표현을 보존하거나, 가사를 연 뒤 삽입할 수 있습니다.</p>
    </section>
  </div>;
}

function SaveIndicator({ state, syncState, onRetry, onCopy }: { state: SaveState; syncState: LocalSyncState; onRetry(): void; onCopy(): void }) {
  if (state.status === "saved" && syncState !== "ready") return null;
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : "방금 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite"><span aria-hidden="true" />{label}
    {state.status === "error" ? <><button type="button" onClick={onRetry}>다시 시도</button><button type="button" onClick={onCopy}>현재 입력 복사</button></> : null}</div>;
}

function LocalDraftIndicator({ state, onRetry, onCopy }: { state: LocalSyncState; onRetry(): void; onCopy(): void }) {
  if (state === "ready") return null;
  const labels: Record<Exclude<LocalSyncState, "ready">, string> = {
    loading: "초안과 서버 연결 확인 중…", "saving-local": "이 기기에 저장하는 중…", local: "이 기기에 임시 저장됨 · 서버 연결 대기",
    syncing: "이 기기에 임시 저장됨 · 서버 동기화 중…", projection: "서버에 저장됨 · 검색 반영 중…", offline: "오프라인 · 이 기기에 임시 저장됨",
    error: "이 기기 초안 또는 서버 저장을 완료하지 못했습니다. 현재 입력은 화면에 남아 있습니다.", unavailable: "서버에 저장할 수 없습니다. 로그인·문서 접근을 확인하고 이탈 전 현재 입력을 복사해 주세요.",
    conflict: "초안을 자동으로 합칠 수 없어 동기화를 멈췄습니다."
  };
  return <p className={`local-draft-state state-${state}`} role="status">{labels[state]}
    {state === "error" || state === "local" || state === "unavailable" ? <button type="button" onClick={onRetry}>동기화 다시 시도</button> : null}
    {state === "error" || state === "unavailable" ? <button type="button" onClick={onCopy}>현재 입력 복사</button> : null}</p>;
}
