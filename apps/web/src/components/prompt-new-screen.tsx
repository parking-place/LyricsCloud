"use client";

import {
  clearPromptCreationDraft, readPromptCreationDraft, writePromptCreationDraft
} from "@lyricscloud/editor";
import { findPromptDuplicates, normalizePromptToken, PROMPT_LIMITS, type PromptRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";
import { PromptTokenBuilder, type PromptBuilderItem } from "./prompt-token-builder.js";

export function PromptNewScreen({ ownerId }: { ownerId: string }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<readonly PromptBuilderItem[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<"local" | "creating" | "error">("local");
  const [cancelOpen, setCancelOpen] = useState(false);
  const requestId = useRef("");
  const created = useRef(false);
  const creating = useRef<Promise<boolean> | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const titleRef = useRef("");
  const itemsRef = useRef<readonly PromptBuilderItem[]>([]);
  const dirtySince = useRef<number | null>(null);
  const router = useRouter();
  const duplicates = useMemo(() => findPromptDuplicates(items.map(({ displayValue }) => normalizePromptToken(displayValue))), [items]);

  function isValid() {
    const titleLength = [...titleRef.current.trim()].length;
    return titleLength > 0 && titleLength <= PROMPT_LIMITS.title
      && itemsRef.current.length <= PROMPT_LIMITS.tokensPerPrompt
      && findPromptDuplicates(itemsRef.current.map(({ displayValue }) => normalizePromptToken(displayValue))).length === 0;
  }

  async function createNow(): Promise<boolean> {
    if (created.current) return true;
    if (!isValid() || !navigator.onLine) return false;
    if (creating.current) return creating.current;
    const pending = (async () => {
      setState("creating");
      try {
        await writes.current.catch(() => undefined);
        const response = await fetch("/api/prompts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: requestId.current, title: titleRef.current,
            tokens: itemsRef.current.map(({ displayValue }) => displayValue), isFavorite: false, isPinned: false, pinOrder: null, color: null })
        });
        const result = await response.json() as { prompt?: PromptRecord };
        if (!response.ok || !result.prompt) throw new Error();
        created.current = true; dirtySince.current = null;
        await clearPromptCreationDraft(ownerId);
        router.replace(`/prompts/${result.prompt.id}`); router.refresh();
        return true;
      } catch { setState("error"); return false; }
      finally { creating.current = null; }
    })();
    creating.current = pending;
    return pending;
  }

  useEffect(() => {
    let active = true;
    void readPromptCreationDraft(ownerId).then((draft) => {
      if (!active) return;
      requestId.current = draft?.requestId ?? crypto.randomUUID();
      titleRef.current = draft?.title ?? "";
      itemsRef.current = (draft?.tokens ?? []).map((displayValue) => ({ occurrenceId: crypto.randomUUID(), displayValue }));
      if (titleRef.current || itemsRef.current.length) dirtySince.current = Date.now();
      setTitle(titleRef.current); setItems(itemsRef.current); setReady(true);
    }).catch(() => { if (active) { requestId.current = crypto.randomUUID(); setState("error"); setReady(true); } });
    const unregister = registerLogoutSave(createNow, () => ({ resourceId: requestId.current || "new-prompt", title: titleRef.current,
      body: itemsRef.current.map(({ displayValue }) => displayValue).join(", ") }));
    setOnline(navigator.onLine);
    const onOnline = () => { setOnline(true); if (isValid()) void createNow(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { active = false; unregister(); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [ownerId]);

  useEffect(() => {
    if (!ready || created.current) return;
    const draft = { requestId: requestId.current, title, tokens: items.map(({ displayValue }) => displayValue), updatedAt: new Date().toISOString() };
    writes.current = writes.current.catch(() => undefined).then(() => writePromptCreationDraft(ownerId, draft));
    void writes.current.then(() => { if (!creating.current) setState("local"); }).catch(() => setState("error"));
    if (!isValid()) return;
    const since = dirtySince.current ?? Date.now(); dirtySince.current = since;
    const timer = window.setTimeout(() => void createNow(), Math.min(900, Math.max(0, 5_000 - (Date.now() - since))));
    return () => window.clearTimeout(timer);
  }, [items, ownerId, ready, title]);

  function updateTitle(value: string) { dirtySince.current ??= Date.now(); titleRef.current = value; setTitle(value); }
  function updateItems(next: readonly PromptBuilderItem[]) { dirtySince.current ??= Date.now(); itemsRef.current = next; setItems(next); }
  async function discard() { await clearPromptCreationDraft(ownerId).catch(() => undefined); router.push("/prompts"); }
  function cancel() { if (titleRef.current || itemsRef.current.length) setCancelOpen(true); else void discard(); }

  const titleLength = [...title.trim()].length;
  const titleError = ready && !title.trim() ? "제목을 입력하면 프롬프트가 자동으로 생성됩니다."
    : titleLength > PROMPT_LIMITS.title ? `제목은 ${PROMPT_LIMITS.title}자 이하로 입력해 주세요.` : "";
  const stateLabel = !ready ? "로컬 초안을 불러오는 중…" : state === "creating" ? "프롬프트를 생성하고 서버에 저장하는 중…"
    : state === "error" ? "이 기기에 임시 저장하지 못했습니다. 내용을 복사해 보관한 뒤 다시 시도해 주세요."
    : !online ? "오프라인 · 이 기기에 임시 저장됨" : duplicates.length ? "중복 정리 전 이 기기에 임시 저장됨"
    : "이 기기에 임시 저장됨 · 유효한 제목을 입력하면 자동 저장됩니다";

  return <section className="prompt-editor-page" aria-labelledby="new-prompt-title">
    <header className="prompt-editor-header"><div><button type="button" className="back-button" onClick={cancel}>← 프롬프트</button><p className="eyebrow">New prompt</p></div>
      <button type="button" className="secondary-button" onClick={cancel}>취소</button>
      <p className={`local-draft-state state-${state}`} role="status">{stateLabel}{state === "error" ? <button type="button" onClick={() => void createNow()}>다시 시도</button> : null}</p>
    </header>
    <div className="prompt-editor-title"><label id="new-prompt-title" htmlFor="new-prompt-title-input">프롬프트 제목</label>
      <input id="new-prompt-title-input" autoFocus disabled={!ready || state === "creating"} value={title}
        aria-invalid={Boolean(titleError && titleLength > PROMPT_LIMITS.title)} placeholder="예: Anthemic Hyperpop"
        onChange={(event) => updateTitle(event.target.value)} />
      <span className={titleLength > PROMPT_LIMITS.title ? "over" : ""}>{titleLength} / {PROMPT_LIMITS.title}</span>
      {titleError ? <small role={titleLength > PROMPT_LIMITS.title ? "alert" : "status"}>{titleError}</small> : null}
    </div>
    <div className="prompt-editor-workspace">
      <PromptTokenBuilder idPrefix="new-prompt" items={items} disabled={!ready || state === "creating"}
        onAdd={(values) => updateItems([...itemsRef.current, ...values.map((displayValue) => ({ occurrenceId: crypto.randomUUID(), displayValue }))])}
        onRemove={(id) => updateItems(itemsRef.current.filter(({ occurrenceId }) => occurrenceId !== id))}
        onCleanup={() => { const seen = new Set<string>(); updateItems(itemsRef.current.filter(({ displayValue }) => {
          const key = normalizePromptToken(displayValue).normalizedValue; if (seen.has(key)) return false; seen.add(key); return true;
        })); }} />
      <aside className="prompt-editor-info" aria-label="새 프롬프트 안내"><h2>자동 저장</h2>
        <p>제목과 태그 초안은 계정별로 이 기기에 먼저 보관됩니다. 중복이 없고 제목이 유효하면 서버 문서로 전환됩니다.</p>
        <h2>태그 순서</h2><p>현재 보이는 순서가 최종 쉼표 문자열의 순서입니다. 순서 이동은 다음 Phase에서 접근 가능한 버튼과 포인터 동작으로 추가합니다.</p>
      </aside>
    </div>
    {cancelOpen ? <div className="dialog-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="new-prompt-cancel-title">
      <h2 id="new-prompt-cancel-title">새 프롬프트 작성을 취소할까요?</h2><p>이 기기에 저장된 제목과 태그 초안도 함께 지워집니다.</p><div>
        <button type="button" autoFocus className="secondary-button" onClick={() => setCancelOpen(false)}>계속 작성</button>
        <button type="button" className="danger-button" onClick={() => void discard()}>초안 삭제 후 나가기</button>
      </div></section></div> : null}
  </section>;
}
