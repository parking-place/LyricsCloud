"use client";

import {
  clearPromptCreationDraft, openPromptCreationDraft, writePromptCreationDraft,
  type CreationDraftLease, type CreationSubmission, type PromptCreationDraft
} from "@lyricscloud/editor";
import { findPromptDuplicates, normalizePromptToken, PROMPT_LIMITS, type PromptRecord, type TemplateRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";
import { PromptTokenBuilder, type PromptBuilderItem } from "./prompt-token-builder.js";

export function PromptNewScreen({ ownerId, templateId }: { ownerId: string; templateId?: string }) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<readonly PromptBuilderItem[]>([]);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<"local" | "saving" | "creating" | "error">("local");
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelRef = useRef(false);
  cancelRef.current = cancelOpen;
  const [composing, setComposing] = useState(false);
  const composingRef = useRef(false);
  const requestId = useRef("");
  const created = useRef(false);
  const creating = useRef<Promise<boolean> | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const titleRef = useRef("");
  const itemsRef = useRef<readonly PromptBuilderItem[]>([]);
  const dirtySince = useRef<number | null>(null);
  const selectedTemplate = useRef<string | null>(templateId ?? null);
  const leaseRef = useRef<CreationDraftLease<PromptCreationDraft> | null>(null);
  const submissionRef = useRef<CreationSubmission | undefined>(undefined);
  const abandonedRef = useRef(false);
  const activeRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const duplicates = useMemo(() => findPromptDuplicates(items.map(({ displayValue }) => normalizePromptToken(displayValue))), [items]);

  function isValid() {
    const titleLength = [...titleRef.current.trim()].length;
    return titleLength > 0 && titleLength <= PROMPT_LIMITS.title
      && itemsRef.current.length <= PROMPT_LIMITS.tokensPerPrompt
      && findPromptDuplicates(itemsRef.current.map(({ displayValue }) => normalizePromptToken(displayValue))).length === 0;
  }

  async function createNow(): Promise<boolean> {
    if (!activeRef.current || abandonedRef.current || composingRef.current || cancelRef.current || !leaseRef.current) return false;
    if (created.current) return true;
    if (!isValid() || !navigator.onLine) return false;
    if (creating.current) return creating.current;
    const pending = (async () => {
      setState("creating");
      try {
        submissionRef.current ??= {
          url: selectedTemplate.current ? `/api/templates/${selectedTemplate.current}/apply` : "/api/prompts",
          body: JSON.stringify(selectedTemplate.current ? { requestId: requestId.current, targetType: "prompt", title: titleRef.current }
            : { requestId: requestId.current, title: titleRef.current,
              tokens: itemsRef.current.map(({ displayValue }) => displayValue), isFavorite: false, isPinned: false, pinOrder: null, color: null })
        };
        await persistDraft();
        if (abandonedRef.current || !activeRef.current) return false;
        abortRef.current = new AbortController();
        const response = await fetch(submissionRef.current.url, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: submissionRef.current.body, signal: abortRef.current.signal
        });
        const result = await response.json() as { prompt?: PromptRecord; resource?: { id: string } };
        const id = result.prompt?.id ?? result.resource?.id;
        if ([400, 401, 403, 404, 422].includes(response.status)) { submissionRef.current = undefined; await persistDraft(); }
        if (!response.ok || !id) throw new Error();
        if (abandonedRef.current || !activeRef.current) return false;
        await writes.current;
        await clearPromptCreationDraft(ownerId, leaseRef.current!.key);
        if (abandonedRef.current || !activeRef.current) return false;
        created.current = true; dirtySince.current = null;
        router.replace(`/prompts/${id}`); router.refresh();
        return true;
      } catch { if (activeRef.current && !abandonedRef.current) setState("error"); return false; }
      finally { creating.current = null; }
    })();
    creating.current = pending;
    return pending;
  }

  useEffect(() => {
    let active = true;
    activeRef.current = true;
    let lease: CreationDraftLease<PromptCreationDraft> | undefined;
    void openPromptCreationDraft(ownerId, templateId).then(async (opened) => {
      if (!active) { opened.release(); return; }
      lease = opened; leaseRef.current = opened;
      const draft = opened.draft;
      submissionRef.current = draft?.submission;
      selectedTemplate.current = draft ? draft.selectedTemplateId ?? null : templateId ?? null;
      requestId.current = draft?.requestId ?? crypto.randomUUID();
      titleRef.current = draft?.title ?? "";
      itemsRef.current = (draft?.tokens ?? []).map((displayValue) => ({ occurrenceId: crypto.randomUUID(), displayValue }));
      if (templateId && !draft) {
        const response = await fetch(`/api/templates/${templateId}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({})) as { template?: TemplateRecord };
        if (!response.ok || result.template?.type !== "prompt") throw new Error("TEMPLATE_UNAVAILABLE");
        titleRef.current ||= `${result.template.title} 작업`;
        itemsRef.current = result.template.tokens.map(({ displayValue }) => ({ occurrenceId: crypto.randomUUID(), displayValue }));
      }
      if (!active) return;
      if (titleRef.current || itemsRef.current.length) dirtySince.current = Date.now();
      setTitle(titleRef.current); setItems(itemsRef.current); setReady(true);
    }).catch(() => { if (active) {
      // A failed lookup must not overwrite a durable draft with initial state.
      setState("error");
    } });
    const unregister = registerLogoutSave(createNow, () => ({ resourceId: requestId.current || "new-prompt", title: titleRef.current,
      body: itemsRef.current.map(({ displayValue }) => displayValue).join(", ") }));
    setOnline(navigator.onLine);
    const onOnline = () => { setOnline(true); if (isValid()) void createNow(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => {
      active = false; activeRef.current = false; abortRef.current?.abort();
      void writes.current.finally(() => lease?.release()).catch(() => undefined);
      unregister(); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline);
    };
  }, [ownerId, templateId]);

  useEffect(() => {
    if (!ready || created.current || abandonedRef.current) return;
    setState("saving");
    const pending = persistDraft();
    void pending.then(() => { if (writes.current === pending && !creating.current && !abandonedRef.current) setState("local"); }).catch(() => setState("error"));
    if (!isValid() || cancelOpen || composing) return;
    const since = dirtySince.current ?? Date.now(); dirtySince.current = since;
    const timer = window.setTimeout(() => void createNow(), Math.min(900, Math.max(0, 5_000 - (Date.now() - since))));
    return () => window.clearTimeout(timer);
  }, [items, ownerId, ready, title, cancelOpen, composing]);

  function persistDraft() {
    const key = leaseRef.current?.key;
    if (!key) return Promise.reject(new Error("DRAFT_NOT_READY"));
    const draft = { requestId: requestId.current, title: titleRef.current, tokens: itemsRef.current.map(({ displayValue }) => displayValue),
      sourceTemplateId: templateId, selectedTemplateId: selectedTemplate.current, submission: submissionRef.current, updatedAt: new Date().toISOString() };
    const pending = writes.current.catch(() => undefined).then(() => {
      if (!abandonedRef.current) return writePromptCreationDraft(ownerId, draft, key);
    });
    writes.current = pending;
    return pending;
  }

  function updateTitle(value: string) { dirtySince.current ??= Date.now(); setState("saving"); titleRef.current = value; setTitle(value); }
  function updateItems(next: readonly PromptBuilderItem[]) { dirtySince.current ??= Date.now(); selectedTemplate.current = null; setState("saving"); itemsRef.current = next; setItems(next); }
  async function discard() {
    abandonedRef.current = true; abortRef.current?.abort();
    await writes.current.catch(() => undefined);
    try { if (leaseRef.current) await clearPromptCreationDraft(ownerId, leaseRef.current.key); }
    catch { abandonedRef.current = false; setState("error"); setCancelOpen(false); return; }
    router.push("/prompts");
  }
  function cancel() { if (titleRef.current || itemsRef.current.length) setCancelOpen(true); else void discard(); }

  const titleLength = [...title.trim()].length;
  const titleError = ready && !title.trim() ? "제목을 입력하면 프롬프트가 자동으로 생성됩니다."
    : titleLength > PROMPT_LIMITS.title ? `제목은 ${PROMPT_LIMITS.title}자 이하로 입력해 주세요.` : "";
  const stateLabel = state === "error" ? (submissionRef.current ? "서버 생성 결과를 확인하지 못했습니다. 다시 시도하여 같은 요청의 결과를 확인해 주세요." : "이 기기에 임시 저장하지 못했습니다. 내용을 복사해 보관한 뒤 다시 시도해 주세요.") : !ready ? "로컬 초안을 불러오는 중…" : state === "creating" ? "프롬프트를 생성하고 서버에 저장하는 중…"
    : state === "saving" ? "이 기기에 초안을 저장하는 중…"
    : !online ? "오프라인 · 이 기기에 임시 저장됨" : duplicates.length ? "중복 정리 전 이 기기에 임시 저장됨"
    : "이 기기에 임시 저장됨 · 유효한 제목을 입력하면 자동 저장됩니다";

  return <section className="prompt-editor-page" aria-labelledby="new-prompt-title" data-pending-input={Boolean(title || items.length)}
    onCompositionStart={() => { composingRef.current = true; setComposing(true); }} onCompositionEnd={() => { composingRef.current = false; setComposing(false); }}>
    <header className="prompt-editor-header"><div><button type="button" className="back-button" onClick={cancel}>← 프롬프트</button><p className="eyebrow">{templateId ? "New prompt · Template copy" : "New prompt"}</p></div>
      <button type="button" className="secondary-button" onClick={cancel}>취소</button>
      <p className={`local-draft-state state-${state}`} role="status">{stateLabel}{state === "error" ? <button type="button" onClick={() => void createNow()}>다시 시도</button> : null}</p>
    </header>
    <nav className="creation-source" aria-label="프롬프트 시작 방식"><a aria-current={!templateId ? "page" : undefined} href="/prompts/new">빈 프롬프트</a><a aria-current={templateId ? "page" : undefined} href="/templates?type=prompt">템플릿에서 선택</a></nav>
    <div className="prompt-editor-title"><label id="new-prompt-title" htmlFor="new-prompt-title-input">프롬프트 제목</label>
      <input id="new-prompt-title-input" autoFocus disabled={!ready || state === "creating" || Boolean(submissionRef.current)} value={title}
        aria-invalid={Boolean(titleError && titleLength > PROMPT_LIMITS.title)} placeholder="예: Anthemic Hyperpop"
        onChange={(event) => updateTitle(event.target.value)} />
      <span className={titleLength > PROMPT_LIMITS.title ? "over" : ""}>{titleLength} / {PROMPT_LIMITS.title}</span>
      {titleError ? <small role={titleLength > PROMPT_LIMITS.title ? "alert" : "status"}>{titleError}</small> : null}
    </div>
    <div className="prompt-editor-workspace">
      <PromptTokenBuilder idPrefix="new-prompt" items={items} disabled={!ready || state === "creating" || Boolean(submissionRef.current)}
        onAdd={(values) => updateItems([...itemsRef.current, ...values.map((displayValue) => ({ occurrenceId: crypto.randomUUID(), displayValue }))])}
        onMove={(id, targetIndex) => {
          const next = [...itemsRef.current]; const currentIndex = next.findIndex(({ occurrenceId }) => occurrenceId === id);
          if (currentIndex < 0 || targetIndex < 0 || targetIndex >= next.length || currentIndex === targetIndex) return;
          const [item] = next.splice(currentIndex, 1); next.splice(targetIndex, 0, item!); updateItems(next);
        }}
        onRemove={(id) => updateItems(itemsRef.current.filter(({ occurrenceId }) => occurrenceId !== id))}
        onCleanup={() => { const seen = new Set<string>(); updateItems(itemsRef.current.filter(({ displayValue }) => {
          const key = normalizePromptToken(displayValue).normalizedValue; if (seen.has(key)) return false; seen.add(key); return true;
        })); }} />
      <aside className="prompt-editor-info" aria-label="새 프롬프트 안내"><h2>자동 저장</h2>
        <p>제목과 태그 초안은 계정별로 이 기기에 먼저 보관됩니다. 중복이 없고 제목이 유효하면 서버 문서로 전환됩니다.</p>
        <h2>태그 순서</h2><p>현재 보이는 순서가 최종 쉼표 문자열의 순서입니다. 손잡이를 끌거나 선택한 태그의 앞으로·뒤로 버튼과 방향키로 이동할 수 있습니다.</p>
      </aside>
    </div>
    {cancelOpen ? <div className="dialog-backdrop"><section className="delete-dialog new-prompt-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="new-prompt-cancel-title">
      <DialogFocusBoundary selector=".new-prompt-cancel-dialog" onClose={() => setCancelOpen(false)} />
      <h2 id="new-prompt-cancel-title">새 프롬프트 작성을 취소할까요?</h2><p>이 기기에 저장된 제목과 태그 초안도 함께 지워집니다.</p><div>
        <button type="button" className="secondary-button" onClick={() => setCancelOpen(false)}>계속 작성</button>
        <button type="button" className="danger-button" onClick={() => void discard()}>초안 삭제 후 나가기</button>
      </div></section></div> : null}
  </section>;
}
