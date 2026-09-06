"use client";

import {
  createBrowserRhymeSync, createCodeMirrorTextEditor, SerializedSaveController,
  type BrowserRhymeSync, type CodeMirrorTextEditor, type LocalSyncState, type SaveState
} from "@lyricscloud/editor";
import { RESOURCE_COLORS, RHYME_LIMITS, type ResourceColor, type RhymeNoteRecord, type RhymeTagRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";
import { createRhymeMetadataSaver } from "../lib/rhyme-metadata.js";
import { RhymeHistory } from "./rhyme-history.js";

interface MetadataDraft {
  readonly title: string;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly color: ResourceColor | null;
}

const colorLabels: Record<ResourceColor, string> = { red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" };

export function RhymeEditor({ ownerId, initialRhyme }: { ownerId: string; initialRhyme: RhymeNoteRecord }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<CodeMirrorTextEditor | null>(null);
  const syncRef = useRef<BrowserRhymeSync | null>(null);
  const controllerRef = useRef<SerializedSaveController<MetadataDraft> | null>(null);
  const titleRef = useRef(initialRhyme.title);
  const bodyRef = useRef(initialRhyme.body);
  const favoriteRef = useRef(initialRhyme.isFavorite);
  const pinnedRef = useRef(initialRhyme.isPinned);
  const pinOrderRef = useRef(initialRhyme.pinOrder);
  const colorRef = useRef(initialRhyme.color);
  const titleComposingRef = useRef(false);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [title, setTitle] = useState(initialRhyme.title);
  const [isFavorite, setIsFavorite] = useState(initialRhyme.isFavorite);
  const [isPinned, setIsPinned] = useState(initialRhyme.isPinned);
  const [color, setColor] = useState<ResourceColor | null>(initialRhyme.color);
  const [tags, setTags] = useState<readonly RhymeTagRecord[]>(initialRhyme.tags);
  const [tagInput, setTagInput] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "saved", sequence: 0, lastSavedAt: null, error: null });
  const [syncState, setSyncState] = useState<LocalSyncState>("loading");
  const [legacyConflict, setLegacyConflict] = useState<{ localBody: string; serverBody: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const router = useRouter();

  function draft(overrides: Partial<MetadataDraft> = {}): MetadataDraft {
    return { title: titleRef.current, isFavorite: favoriteRef.current, isPinned: pinnedRef.current,
      pinOrder: pinOrderRef.current, color: colorRef.current, ...overrides };
  }

  useEffect(() => {
    const parent = mountRef.current;
    if (!parent) return;
    let active = true;
    const saveMetadata = createRhymeMetadataSaver(initialRhyme.id, draft());
    const controller = new SerializedSaveController<MetadataDraft>({
      initialDraft: draft(), initialRowVersion: initialRhyme.rowVersion,
      async save(value) {
        if (!value.title.trim() || [...value.title.trim()].length > RHYME_LIMITS.title) throw new Error("VALIDATION_FAILED");
        return saveMetadata(value);
      },
      onStateChange(state) { if (active) setSaveState(state); }
    });
    controllerRef.current = controller;
    const editor = createCodeMirrorTextEditor({
      parent, initialValue: initialRhyme.body, ariaLabel: "라임 노트 본문", readOnly: true,
      onChange(value) { bodyRef.current = value; },
      onCompositionStart() { syncRef.current?.setComposing(true); },
      onCompositionEnd() { syncRef.current?.setComposing(false); },
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
    const leave = () => { void controller.flush(); syncRef.current?.leave(); };
    const unregisterLogout = registerLogoutSave(async () => {
      if (titleComposingRef.current) return false;
      await controller.flush();
      if (controller.state.status !== "saved") return false;
      return await syncRef.current?.checkpoint("leave") ?? false;
    }, () => ({ resourceId: initialRhyme.id, title: titleRef.current, body: bodyRef.current }));
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
    if (!manualCopy) return;
    manualCopyRef.current?.focus(); manualCopyRef.current?.select();
  }, [manualCopy]);
  useEffect(() => () => { if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current); }, []);

  function changeTitle(value: string) {
    titleRef.current = value; setTitle(value);
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
    await controllerRef.current?.flush();
    if (controllerRef.current?.state.status !== "saved" || !await syncRef.current?.flush()) {
      setNotice("현재 변경 내용을 먼저 저장해야 합니다. 저장과 동기화를 다시 시도해 주세요."); return false;
    }
    if (checkpoint && !await syncRef.current?.checkpoint("leave")) {
      setNotice("이동 전 수정 기록을 저장하지 못했습니다. 연결을 확인해 주세요."); return false;
    }
    return true;
  }

  async function goBack() {
    if (busy || !await flushBeforeCommand(true)) return;
    router.push("/rhymes");
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

  async function copyBody() {
    const value = editorRef.current?.value ?? bodyRef.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(value);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      setToast("라임 노트 전체를 복사했습니다");
      toastTimerRef.current = window.setTimeout(() => setToast(null), 3_000);
    } catch { setManualCopy(value); }
  }

  async function deleteCurrent() {
    if (busy || !await flushBeforeCommand()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/rhymes/${initialRhyme.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      router.replace("/rhymes"); router.refresh();
    } catch { setBusy(false); setDeleteOpen(false); setNotice("라임 노트를 삭제하지 못했습니다. 현재 화면을 유지합니다."); }
  }

  const titleLength = [...title.trim()].length;
  const titleError = !title.trim() ? "제목을 입력해야 저장할 수 있습니다." : titleLength > RHYME_LIMITS.title ? `제목은 ${RHYME_LIMITS.title}자 이하로 입력해 주세요.` : "";

  return <section className="rhyme-editor-page" aria-labelledby="rhyme-title-label">
    <header className="rhyme-editor-header">
      <div><button type="button" className="back-button" onClick={() => void goBack()}>← 라임 노트</button><p className="eyebrow">Rhyme editor</p></div>
      <div className="rhyme-editor-actions">
        <button type="button" onClick={() => setHistoryOpen(true)}>수정 기록</button>
        <button type="button" onClick={() => void copyBody()}>전체 복사</button>
        <button type="button" className="danger-text" disabled={busy} onClick={() => setDeleteOpen(true)}>삭제</button>
      </div>
      <SaveIndicator state={saveState} syncState={syncState} onRetry={() => void controllerRef.current?.retry()} />
      <LocalDraftIndicator state={syncState} onRetry={() => syncRef.current?.retry()} />
    </header>
    {notice ? <p className="editor-command-notice" role="status">{notice}</p> : null}
    {legacyConflict ? <details className="editor-command-notice" open><summary>이전 로컬 초안과 서버 본문을 자동으로 합칠 수 없어 동기화를 멈췄습니다.</summary>
      <label>이전 로컬 초안<textarea readOnly value={legacyConflict.localBody} /></label><label>서버 본문<textarea readOnly value={legacyConflict.serverBody} /></label>
    </details> : null}
    <div className="rhyme-editor-title"><label id="rhyme-title-label" htmlFor="rhyme-title">노트 제목</label>
      <input id="rhyme-title" value={title} aria-invalid={Boolean(titleError)} onChange={(event) => changeTitle(event.target.value)}
        onCompositionStart={() => { titleComposingRef.current = true; }}
        onCompositionEnd={() => { titleComposingRef.current = false; controllerRef.current?.compositionEnd(); }} />
      <span className={titleLength > RHYME_LIMITS.title ? "over" : ""}>{titleLength.toLocaleString()} / {RHYME_LIMITS.title}</span>
      {titleError ? <small role="alert">{titleError}</small> : null}
    </div>
    <div className="rhyme-editor-workspace">
      <div className="rhyme-editor-document">
        <div className="rhyme-editor-surface" data-rhyme-id={initialRhyme.id} ref={mountRef} />
        <footer><span>순수 텍스트 · 빈 본문 허용 · 최대 {RHYME_LIMITS.body.toLocaleString()}자</span><span>본문 자동 동기화</span></footer>
      </div>
      <aside className="rhyme-editor-side" aria-label="라임 노트 설정">
        <RhymeSettings idPrefix="desktop" tags={tags} tagInput={tagInput} tagBusy={tagBusy} isFavorite={isFavorite} isPinned={isPinned} color={color}
          onTagInput={setTagInput} onAddTag={addTag} onRemoveTag={(tag) => void removeTag(tag)}
          onFavorite={toggleFavorite} onPinned={togglePinned} onColor={changeColor} />
      </aside>
    </div>
    <div className="rhyme-mobile-dock" role="group" aria-label="라임 노트 편집 도구">
      <button type="button" onClick={() => void copyBody()}>⧉ 전체 복사</button>
      <button type="button" onClick={() => setHistoryOpen(true)}>◴ 수정 기록</button>
      <button type="button" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>⚙ 태그·설정</button>
    </div>
    {settingsOpen ? <div className="editor-sheet-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <section className="songform-sheet rhyme-settings-sheet" role="dialog" aria-modal="true" aria-labelledby="rhyme-settings-title">
        <header><h2 id="rhyme-settings-title">태그와 표시 설정</h2><button type="button" onClick={() => setSettingsOpen(false)}>닫기</button></header>
        <RhymeSettings idPrefix="mobile" tags={tags} tagInput={tagInput} tagBusy={tagBusy} isFavorite={isFavorite} isPinned={isPinned} color={color}
          onTagInput={setTagInput} onAddTag={addTag} onRemoveTag={(tag) => void removeTag(tag)}
          onFavorite={toggleFavorite} onPinned={togglePinned} onColor={changeColor} />
        <button type="button" className="rhyme-sheet-delete danger-text" disabled={busy} onClick={() => { setSettingsOpen(false); setDeleteOpen(true); }}>라임 노트 삭제</button>
      </section>
    </div> : null}
    {historyOpen ? <RhymeHistory onClose={() => setHistoryOpen(false)}
      readHistory={async () => { const sync = syncRef.current; if (!sync || !await sync.flush()) throw new Error("REVISION_UNAVAILABLE"); return sync.listRevisions(); }}
      readRevision={async (id) => { if (!syncRef.current) throw new Error("REVISION_UNAVAILABLE"); return syncRef.current.getRevision(id); }}
      restore={async (id, input) => { if (!await flushBeforeCommand() || !syncRef.current) throw new Error("REVISION_UNAVAILABLE"); await syncRef.current.restoreRevision(id, input); }} /> : null}
    {deleteOpen ? <div className="dialog-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="rhyme-delete-title">
      <p className="eyebrow">휴지통으로 이동</p><h2 id="rhyme-delete-title">‘{title}’ 라임 노트를 삭제할까요?</h2><p>노트는 휴지통으로 이동하며 태그와 곡 연결 원본은 보존됩니다.</p>
      <div><button type="button" autoFocus className="secondary-button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button>
        <button type="button" className="danger-button" disabled={busy} onClick={() => void deleteCurrent()}>{busy ? "삭제 중…" : "라임 노트 삭제 확인"}</button></div>
    </section></div> : null}
    {toast ? <div className="copy-toast" role="status" aria-live="polite">{toast}</div> : null}
    {manualCopy !== null ? <div className="dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setManualCopy(null); }}>
      <section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="rhyme-copy-title"><h2 id="rhyme-copy-title">직접 복사해 주세요</h2>
        <p>브라우저가 클립보드 쓰기를 허용하지 않았습니다. 아래에는 같은 내용이 선택되어 있습니다.</p>
        <textarea ref={manualCopyRef} readOnly aria-label="수동 복사할 라임 노트" value={manualCopy} /><button type="button" onClick={() => setManualCopy(null)}>닫기</button>
      </section></div> : null}
  </section>;
}

function RhymeSettings(props: {
  idPrefix: string; tags: readonly RhymeTagRecord[]; tagInput: string; tagBusy: boolean; isFavorite: boolean; isPinned: boolean; color: ResourceColor | null;
  onTagInput(value: string): void; onAddTag(event: FormEvent): void; onRemoveTag(tag: RhymeTagRecord): void;
  onFavorite(): void; onPinned(): void; onColor(color: ResourceColor | null): void;
}) {
  return <div className="rhyme-settings">
    <section><div className="other-panel-heading"><strong>태그</strong><span>{props.tags.length} / {RHYME_LIMITS.tagsPerNote}</span></div>
      <form className="rhyme-tag-form" onSubmit={props.onAddTag}><label htmlFor={`${props.idPrefix}-rhyme-tag`}>새 태그</label><div><input id={`${props.idPrefix}-rhyme-tag`} value={props.tagInput} maxLength={RHYME_LIMITS.tag}
        placeholder="예: air, 펀치라인" onChange={(event) => props.onTagInput(event.target.value)} /><button type="submit" disabled={props.tagBusy || !props.tagInput.trim()}>추가</button></div></form>
      {props.tags.length ? <ul className="rhyme-editor-tags">{props.tags.map((tag) => <li key={tag.id}><span>#{tag.displayValue}</span><button type="button" disabled={props.tagBusy} aria-label={`${tag.displayValue} 태그 제거`} onClick={() => props.onRemoveTag(tag)}>×</button></li>)}</ul>
        : <p className="rhyme-setting-empty">아직 태그가 없습니다.</p>}
    </section>
    <section><div className="other-panel-heading"><strong>표시 설정</strong></div>
      <div className="rhyme-setting-toggles"><button type="button" aria-pressed={props.isFavorite} onClick={props.onFavorite}>★ {props.isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button>
        <button type="button" aria-pressed={props.isPinned} onClick={props.onPinned}>⌁ {props.isPinned ? "고정됨" : "고정"}</button></div>
      <fieldset className="rhyme-color-options"><legend>색상</legend><button type="button" aria-pressed={props.color === null} onClick={() => props.onColor(null)}>없음</button>
        {RESOURCE_COLORS.map((value) => <button type="button" key={value} className={`color-${value}`} aria-pressed={props.color === value} onClick={() => props.onColor(value)}><span aria-hidden="true" />{colorLabels[value]}</button>)}</fieldset>
    </section>
  </div>;
}

function SaveIndicator({ state, syncState, onRetry }: { state: SaveState; syncState: LocalSyncState; onRetry(): void }) {
  if (state.status === "saved" && syncState !== "ready") return null;
  const label = state.status === "dirty" ? "변경 내용 있음" : state.status === "saving" ? "변경 내용을 저장하는 중…" : state.status === "error" ? "저장하지 못했습니다" : "방금 저장됨";
  return <div className={`save-indicator is-${state.status}`} role="status" aria-live="polite"><span aria-hidden="true" />{label}
    {state.status === "error" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}</div>;
}

function LocalDraftIndicator({ state, onRetry }: { state: LocalSyncState; onRetry(): void }) {
  if (state === "ready") return null;
  const labels: Record<Exclude<LocalSyncState, "ready">, string> = {
    loading: "초안과 서버 연결 확인 중…", "saving-local": "이 기기에 저장하는 중…", local: "이 기기에 임시 저장됨 · 서버 연결 대기",
    syncing: "이 기기에 임시 저장됨 · 서버 동기화 중…", projection: "서버에 저장됨 · 검색 반영 중…", offline: "오프라인 · 이 기기에 임시 저장됨",
    error: "동기화를 완료하지 못했습니다. 현재 입력을 복사해 보관해 주세요.", unavailable: "로그인 또는 문서 접근을 확인해 주세요. 현재 입력은 보존됩니다.",
    conflict: "초안을 자동으로 합칠 수 없어 동기화를 멈췄습니다."
  };
  return <p className={`local-draft-state state-${state}`} role="status">{labels[state]}
    {state === "error" || state === "local" || state === "unavailable" ? <button type="button" onClick={onRetry}>동기화 다시 시도</button> : null}</p>;
}
