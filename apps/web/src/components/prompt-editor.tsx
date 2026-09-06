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
  const snapshotRef = useRef(snapshot);
  const syncRef = useRef<BrowserPromptSync | null>(null);
  const composing = useRef(false);
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

  const titleLength = [...snapshot.title.trim()].length;
  const titleError = !snapshot.title.trim() ? "제목을 입력해야 검색용 읽기 모델에 반영됩니다."
    : titleLength > PROMPT_LIMITS.title ? `제목은 ${PROMPT_LIMITS.title}자 이하로 입력해 주세요.` : "";
  return <section className="prompt-editor-page" aria-labelledby="prompt-title-label">
    <header className="prompt-editor-header"><div><button type="button" className="back-button" onClick={() => void back()}>← 프롬프트</button><p className="eyebrow">Prompt editor</p></div>
      <div className="prompt-editor-actions"><button type="button" disabled={!editable} onClick={() => setHistoryOpen(true)}>수정 기록</button>
        <button type="button" disabled title="Phase 4에서 제공">전체 복사 · 준비 중</button></div>
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
        onAdd={addTokens} onRemove={(id) => syncRef.current?.removeToken(id)} onCleanup={cleanup} />
      <aside className="prompt-editor-info" aria-label="프롬프트 정보">
        <section><h2>복사될 내용</h2><p className="prompt-copy-preview">{snapshot.plainText || "태그를 추가하면 쉼표 문자열을 미리 볼 수 있습니다."}</p></section>
        <section><h2>태그 수</h2><strong>{snapshot.tokens.length}개</strong><p>중복 제외 · {snapshot.readTokens.length}개</p></section>
        <section><h2>자동 저장</h2><p>제목과 태그 순서는 이 기기에 먼저 보관되고 같은 계정의 탭·기기에 병합됩니다.</p></section>
      </aside>
    </div>
    {historyOpen ? <PromptHistory onClose={() => setHistoryOpen(false)}
      readHistory={async () => { const sync = syncRef.current; if (!sync || !await sync.flush()) throw new Error(); return sync.listRevisions(); }}
      readRevision={async (id) => { if (!syncRef.current) throw new Error(); return syncRef.current.getRevision(id); }}
      restore={async (id, input) => { if (!syncRef.current) throw new Error(); await syncRef.current.restoreRevision(id, input); }} /> : null}
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
