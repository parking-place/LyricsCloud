"use client";

import {
  createBrowserPromptSync, type BrowserPromptSync, type LocalSyncState, type PromptEditorSnapshot
} from "@lyricscloud/editor";
import { PROMPT_LIMITS, type PromptRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";
import { PromptHistory } from "./prompt-history.js";
import { PromptTokenBuilder } from "./prompt-token-builder.js";

interface SongCandidate { readonly id: string; readonly title: string; readonly isLinked: boolean }

export function PromptEditor({ ownerId, initialPrompt }: { ownerId: string; initialPrompt: PromptRecord }) {
  const [snapshot, setSnapshot] = useState<PromptEditorSnapshot>({
    title: initialPrompt.title,
    items: initialPrompt.tokens.map((token, index) => ({ occurrenceId: `initial-${index}`, displayValue: token.displayValue })),
    tokens: initialPrompt.tokens, readTokens: initialPrompt.tokens, plainText: initialPrompt.plainText, duplicates: []
  });
  const [syncState, setSyncState] = useState<LocalSyncState>("loading");
  const [editable, setEditable] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(initialPrompt.isFavorite);
  const [isPinned, setIsPinned] = useState(initialPrompt.isPinned);
  const [metadataBusy, setMetadataBusy] = useState<"favorite" | "pin" | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [songSearch, setSongSearch] = useState("");
  const [songCandidates, setSongCandidates] = useState<readonly SongCandidate[]>([]);
  const [songLoading, setSongLoading] = useState(true);
  const [songError, setSongError] = useState("");
  const [songRetryKey, setSongRetryKey] = useState(0);
  const [songBusyId, setSongBusyId] = useState<string | null>(null);
  const [unlinkCandidate, setUnlinkCandidate] = useState<SongCandidate | null>(null);
  const [linkedSongIds, setLinkedSongIds] = useState(() => new Set(initialPrompt.linkedSongIds));
  const snapshotRef = useRef(snapshot);
  const syncRef = useRef<BrowserPromptSync | null>(null);
  const composing = useRef(false);
  const duplicateRequest = useRef<string | null>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let sync: BrowserPromptSync | null = null;
    const unregister = registerLogoutSave(async () => sync?.flush() ?? true, () => ({
      resourceId: initialPrompt.id, title: snapshotRef.current.title, body: snapshotRef.current.tokens.map(({ displayValue }) => displayValue).join(", ")
    }));
    void createBrowserPromptSync({
      ownerId, resourceId: initialPrompt.id,
      onPromptChange(value) { if (active) { snapshotRef.current = value; setSnapshot(value); } },
      onStateChange(value) { if (active) setSyncState(value); },
      onEditableChange(value) { if (active) setEditable(value); }
    }).then((created) => { if (!active) void created.destroy(); else { sync = created; syncRef.current = created; } });
    const onPageHide = () => sync?.leave();
    window.addEventListener("pagehide", onPageHide);
    return () => { active = false; unregister(); window.removeEventListener("pagehide", onPageHide); syncRef.current = null; void sync?.destroy(); };
  }, [initialPrompt.id, ownerId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSongLoading(true); setSongError("");
      const params = new URLSearchParams({ limit: "20" });
      if (songSearch.trim()) params.set("search", songSearch.trim());
      void fetch(`/api/prompts/${initialPrompt.id}/songs?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ items: readonly SongCandidate[] }>; })
        .then(({ items }) => setSongCandidates(items))
        .catch(() => { if (!controller.signal.aborted) { setSongCandidates([]); setSongError("곡 후보를 불러오지 못했습니다."); } })
        .finally(() => { if (!controller.signal.aborted) setSongLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [initialPrompt.id, songRetryKey, songSearch]);

  useEffect(() => {
    if (manualCopy !== null) window.requestAnimationFrame(() => { manualCopyRef.current?.focus(); manualCopyRef.current?.select(); });
  }, [manualCopy]);

  async function flushBeforeLeave() {
    const sync = syncRef.current;
    if (!sync || !await sync.flush()) { setNotice("현재 변경 내용을 먼저 동기화해야 합니다. 연결을 확인해 주세요."); return false; }
    if (!await sync.checkpoint("leave")) { setNotice("이동 전 수정 기록을 저장하지 못했습니다. 연결을 확인해 주세요."); return false; }
    return true;
  }
  async function back() { if (await flushBeforeLeave()) router.push("/prompts"); }
  async function addTokens(values: readonly string[], bulk: boolean) {
    const sync = syncRef.current;
    if (!sync) throw new Error();
    if (bulk && [...values.join(",")].length >= 1_000 && !await sync.checkpoint("large_paste")) {
      setNotice("대규모 붙여넣기 전 수정 기록을 만들지 못했습니다. 현재 태그는 변경하지 않았습니다."); return;
    }
    sync.insertTokens(values);
  }
  async function cleanup() {
    const sync = syncRef.current;
    if (!sync || !snapshotRef.current.duplicates.length) return;
    if (!await sync.checkpoint("large_paste")) { setNotice("중복 정리 전 수정 기록을 만들지 못했습니다. 태그는 변경하지 않았습니다."); return; }
    sync.cleanupDuplicates(); setNotice("중복 태그를 첫 번째 표시 값으로 정리했습니다. 이전 상태는 수정 기록에 남겼습니다.");
  }
  function changeTitle(value: string) {
    const next = { ...snapshotRef.current, title: value };
    snapshotRef.current = next; setSnapshot(next);
    if (!composing.current) syncRef.current?.setTitle(value);
  }

  async function copyPrompt() {
    const value = snapshotRef.current.plainText;
    if (!value) { setNotice("복사할 태그를 먼저 추가해 주세요."); return; }
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(value);
    } catch { setManualCopy(value); return; }
    try {
      const response = await fetch(`/api/prompts/${initialPrompt.id}/use`, { method: "POST" });
      if (!response.ok) throw new Error();
      setNotice("쉼표로 정리한 프롬프트를 복사했습니다.");
    } catch { setNotice("프롬프트는 복사했지만 최근 사용 기록을 저장하지 못했습니다."); }
  }

  async function completeManualCopy() {
    try { await fetch(`/api/prompts/${initialPrompt.id}/use`, { method: "POST" }); } catch { /* selection remains the recovery path */ }
    setManualCopy(null); setNotice("수동으로 복사할 쉼표 문자열을 확인했습니다.");
  }

  async function duplicatePrompt() {
    if (duplicating || !syncRef.current) return;
    setDuplicating(true); setNotice("");
    try {
      if (!await syncRef.current.checkpoint("duplicate")) throw new Error();
      const requestId = duplicateRequest.current ?? crypto.randomUUID();
      duplicateRequest.current = requestId;
      const response = await fetch(`/api/prompts/${initialPrompt.id}/duplicate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { prompt: { id: string } };
      duplicateRequest.current = null;
      window.location.assign(`/prompts/${result.prompt.id}?from=duplicate`);
    } catch { setDuplicating(false); setNotice("복제 전 수정 기록 또는 복사본을 만들지 못했습니다. 같은 요청으로 다시 시도할 수 있습니다."); }
  }

  async function toggleMetadata(field: "favorite" | "pin") {
    if (metadataBusy) return;
    const previous = field === "favorite" ? isFavorite : isPinned;
    const next = !previous;
    field === "favorite" ? setIsFavorite(next) : setIsPinned(next);
    setMetadataBusy(field); setNotice("");
    try {
      const response = await fetch(`/api/prompts/${initialPrompt.id}/${field}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "favorite" ? { value: next } : { value: next, pinOrder: next ? 0 : null })
      });
      if (!response.ok) throw new Error();
      setNotice(`${field === "favorite" ? "즐겨찾기" : "고정"}를 ${next ? "설정" : "해제"}했습니다.`);
    } catch {
      field === "favorite" ? setIsFavorite(previous) : setIsPinned(previous);
      setNotice("표시 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setMetadataBusy(null); }
  }

  async function changeSong(candidate: SongCandidate) {
    if (songBusyId) return;
    setSongBusyId(candidate.id); setSongError("");
    try {
      const response = await fetch(`/api/prompts/${initialPrompt.id}/songs/${candidate.id}`, { method: candidate.isLinked ? "DELETE" : "PUT" });
      if (!response.ok) throw new Error();
      setSongCandidates((items) => items.map((item) => item.id === candidate.id ? { ...item, isLinked: !candidate.isLinked } : item));
      setLinkedSongIds((current) => {
        const next = new Set(current);
        candidate.isLinked ? next.delete(candidate.id) : next.add(candidate.id);
        return next;
      });
      setNotice(`‘${candidate.title}’ 곡 연결을 ${candidate.isLinked ? "해제" : "추가"}했습니다.`);
      setUnlinkCandidate(null);
    } catch { setSongError("곡 연결을 변경하지 못했습니다. 다시 시도해 주세요."); }
    finally { setSongBusyId(null); }
  }

  const titleLength = [...snapshot.title.trim()].length;
  const titleError = !snapshot.title.trim() ? "제목을 입력해야 검색용 읽기 모델에 반영됩니다."
    : titleLength > PROMPT_LIMITS.title ? `제목은 ${PROMPT_LIMITS.title}자 이하로 입력해 주세요.` : "";
  return <section className="prompt-editor-page" aria-labelledby="prompt-title-label">
    <header className="prompt-editor-header"><div><button type="button" className="back-button" onClick={() => void back()}>← 프롬프트</button><p className="eyebrow">Prompt editor</p></div>
      <div className="prompt-editor-actions"><button type="button" aria-pressed={isFavorite} disabled={!editable || metadataBusy !== null} onClick={() => void toggleMetadata("favorite")}>★ {isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button>
        <button type="button" aria-pressed={isPinned} disabled={!editable || metadataBusy !== null} onClick={() => void toggleMetadata("pin")}>⌁ {isPinned ? "고정됨" : "고정"}</button>
        <button type="button" disabled={!editable || duplicating} onClick={() => void duplicatePrompt()}>{duplicating ? "복제 중…" : "복제"}</button>
        <button type="button" disabled={!editable} onClick={() => setHistoryOpen(true)}>수정 기록</button>
        <button type="button" className="prompt-copy-button" disabled={!editable} onClick={() => void copyPrompt()}>전체 복사</button></div>
      <SyncIndicator state={syncState} onRetry={() => syncRef.current?.retry()} />
    </header>
    {notice ? <p className="editor-command-notice" role="status">{notice}</p> : null}
    <div className="prompt-editor-title"><label id="prompt-title-label" htmlFor="prompt-title">프롬프트 제목</label>
      <input id="prompt-title" value={snapshot.title} disabled={!editable} aria-invalid={Boolean(titleError)}
        onChange={(event) => changeTitle(event.target.value)}
        onCompositionStart={() => { composing.current = true; syncRef.current?.setComposing(true); }}
        onCompositionEnd={(event) => { composing.current = false; syncRef.current?.setComposing(false); syncRef.current?.setTitle(event.currentTarget.value); }} />
      <span className={titleLength > PROMPT_LIMITS.title ? "over" : ""}>{titleLength} / {PROMPT_LIMITS.title}</span>
      {titleError ? <small role="alert">{titleError}</small> : null}
    </div>
    <div className="prompt-editor-workspace">
      <PromptTokenBuilder idPrefix="prompt" items={snapshot.items} disabled={!editable}
        onAdd={addTokens} onMove={(id, index) => syncRef.current?.moveToken(id, index)}
        onRemove={(id) => syncRef.current?.removeToken(id)} onCleanup={cleanup} />
      <aside className="prompt-editor-info" aria-label="프롬프트 정보">
        <section><h2>복사될 내용</h2><p className="prompt-copy-preview">{snapshot.plainText || "태그를 추가하면 쉼표 문자열을 미리 볼 수 있습니다."}</p></section>
        <section><h2>태그 수</h2><strong>{snapshot.tokens.length}개</strong><p>중복 제외 · {snapshot.readTokens.length}개</p></section>
        <section className="prompt-song-links"><div className="other-panel-heading"><strong>연결 곡</strong><span>{linkedSongIds.size}개</span></div>
          <label htmlFor="prompt-song-search">곡 검색</label><input id="prompt-song-search" type="search" maxLength={200} value={songSearch} placeholder="곡 제목 검색" onChange={(event) => setSongSearch(event.target.value)} />
          {songLoading ? <p role="status">곡 후보를 불러오는 중…</p> : null}
          {songError ? <p role="alert">{songError} <button type="button" onClick={() => setSongRetryKey((value) => value + 1)}>다시 시도</button></p> : null}
          {!songLoading && !songError && !songCandidates.length ? <p>{songSearch.trim() ? "검색에 맞는 곡이 없습니다." : "연결할 수 있는 곡이 없습니다."}</p> : null}
          {!songLoading && !songError && songCandidates.length ? <ul>{songCandidates.map((song) => <li key={song.id}><span>{song.title}</span>
            <button type="button" aria-pressed={song.isLinked} disabled={songBusyId !== null}
              onClick={() => song.isLinked ? setUnlinkCandidate(song) : void changeSong(song)}>{songBusyId === song.id ? "처리 중…" : song.isLinked ? "연결 해제" : "연결"}</button></li>)}</ul> : null}
        </section>
        <section className="prompt-template-handoff"><h2>템플릿</h2><p>프롬프트 템플릿은 0.8.0에서 기존 내용을 보호하는 적용 규칙과 함께 제공됩니다.</p></section>
        <section><h2>자동 저장</h2><p>제목과 태그 순서는 이 기기에 먼저 보관되고 같은 계정의 탭·기기에 병합됩니다.</p></section>
      </aside>
    </div>
    {historyOpen ? <PromptHistory onClose={() => setHistoryOpen(false)}
      readHistory={async () => { const sync = syncRef.current; if (!sync || !await sync.flush()) throw new Error(); return sync.listRevisions(); }}
      readRevision={async (id) => { if (!syncRef.current) throw new Error(); return syncRef.current.getRevision(id); }}
      restore={async (id, input) => { if (!syncRef.current) throw new Error(); await syncRef.current.restoreRevision(id, input); }} /> : null}
    {unlinkCandidate ? <div className="dialog-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-unlink-title">
      <p className="eyebrow">연결만 해제</p><h2 id="prompt-unlink-title">‘{unlinkCandidate.title}’ 곡 연결을 해제할까요?</h2><p>프롬프트와 곡 원본은 삭제되지 않으며 다른 곡 연결도 그대로 유지됩니다.</p>
      <div><button type="button" autoFocus disabled={songBusyId !== null} onClick={() => setUnlinkCandidate(null)}>취소</button>
        <button type="button" disabled={songBusyId !== null} onClick={() => void changeSong(unlinkCandidate)}>{songBusyId ? "해제 중…" : "연결 해제 확인"}</button></div>
    </section></div> : null}
    {manualCopy !== null ? <div className="dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setManualCopy(null); }}>
      <section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-editor-copy-title"><p className="eyebrow">Clipboard fallback</p>
        <h2 id="prompt-editor-copy-title">프롬프트를 직접 복사해 주세요</h2><p>브라우저가 클립보드 쓰기를 허용하지 않았습니다. 미리보기와 같은 쉼표 문자열이 아래에 선택되어 있습니다.</p>
        <textarea ref={manualCopyRef} readOnly aria-label="수동 복사할 프롬프트" value={manualCopy} />
        <div className="dialog-actions"><button type="button" onClick={() => setManualCopy(null)}>취소</button><button type="button" className="primary-link" onClick={() => void completeManualCopy()}>복사 완료</button></div>
      </section></div> : null}
  </section>;
}

function SyncIndicator({ state, onRetry }: { state: LocalSyncState; onRetry: () => void }) {
  const labels: Record<LocalSyncState, string> = {
    loading: "초안과 서버 연결 확인 중…", "saving-local": "이 기기에 저장하는 중…", ready: "방금 저장됨",
    local: "이 기기에 임시 저장됨 · 서버 연결 대기", syncing: "이 기기에 임시 저장됨 · 서버 동기화 중…",
    projection: "서버에 저장됨 · 검색 반영 중…", offline: "오프라인 · 이 기기에 임시 저장됨",
    error: "저장 실패 · 다시 시도 필요", unavailable: "로그인 또는 문서 접근을 확인해 주세요.", conflict: "동기화 충돌 · 현재 입력 보존됨"
  };
  return <p className={`local-draft-state state-${state}`} role="status" aria-live="polite"><span aria-hidden="true" />{labels[state]}
    {state === "error" || state === "local" || state === "unavailable" ? <button type="button" onClick={onRetry}>다시 시도</button> : null}</p>;
}
