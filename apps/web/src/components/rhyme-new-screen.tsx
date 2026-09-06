"use client";

import { clearRhymeCreationDraft, readRhymeCreationDraft, writeRhymeCreationDraft } from "@lyricscloud/editor";
import { RHYME_LIMITS, type RhymeNoteRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { registerLogoutSave } from "../lib/account-cache.js";

export function RhymeNewScreen({ ownerId }: { ownerId: string }) {
  const titleRef = useRef("");
  const bodyRef = useRef("");
  const requestIdRef = useRef("");
  const creatingRef = useRef<Promise<boolean> | null>(null);
  const createdRef = useRef(false);
  const draftWritesRef = useRef<Promise<void>>(Promise.resolve());
  const dirtySinceRef = useRef<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ready, setReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [state, setState] = useState<"local" | "creating" | "error">("local");
  const [cancelOpen, setCancelOpen] = useState(false);
  const router = useRouter();

  function valid() {
    const count = [...titleRef.current.trim()].length;
    return count > 0 && count <= RHYME_LIMITS.title && [...bodyRef.current].length <= RHYME_LIMITS.body;
  }

  async function createNow(): Promise<boolean> {
    if (createdRef.current) return true;
    if (!valid() || !navigator.onLine) return false;
    if (creatingRef.current) return creatingRef.current;
    const pending = (async () => {
      setState("creating");
      try {
        await draftWritesRef.current.catch(() => undefined);
        const response = await fetch("/api/rhymes", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: requestIdRef.current, title: titleRef.current, body: bodyRef.current,
            isFavorite: false, isPinned: false, pinOrder: null, color: null })
        });
        const result = await response.json() as { rhyme?: RhymeNoteRecord };
        if (!response.ok || !result.rhyme) throw new Error();
        createdRef.current = true;
        dirtySinceRef.current = null;
        await clearRhymeCreationDraft(ownerId);
        router.replace(`/rhymes/${result.rhyme.id}`); router.refresh();
        return true;
      } catch { setState("error"); return false; }
      finally { creatingRef.current = null; }
    })();
    creatingRef.current = pending;
    return pending;
  }

  useEffect(() => {
    let active = true;
    void readRhymeCreationDraft(ownerId).then((draft) => {
      if (!active) return;
      requestIdRef.current = draft?.requestId ?? crypto.randomUUID();
      titleRef.current = draft?.title ?? ""; bodyRef.current = draft?.body ?? "";
      if (draft?.title || draft?.body) dirtySinceRef.current = Date.now();
      setTitle(titleRef.current); setBody(bodyRef.current); setReady(true);
    }).catch(() => {
      if (!active) return;
      requestIdRef.current = crypto.randomUUID(); setState("error"); setReady(true);
    });
    const unregister = registerLogoutSave(createNow, () => ({ resourceId: requestIdRef.current || "new-rhyme", title: titleRef.current, body: bodyRef.current }));
    setIsOnline(navigator.onLine);
    const online = () => { setIsOnline(true); if (valid()) void createNow(); };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { active = false; unregister(); window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [ownerId]);

  useEffect(() => {
    if (!ready || createdRef.current) return;
    const draft = { requestId: requestIdRef.current, title, body, updatedAt: new Date().toISOString() };
    draftWritesRef.current = draftWritesRef.current.catch(() => undefined).then(() => writeRhymeCreationDraft(ownerId, draft));
    void draftWritesRef.current.then(() => { if (!creatingRef.current) setState("local"); }).catch(() => setState("error"));
    if (!valid()) return;
    const dirtySince = dirtySinceRef.current ?? Date.now();
    dirtySinceRef.current = dirtySince;
    const timer = window.setTimeout(() => { void createNow(); }, Math.min(900, Math.max(0, 5_000 - (Date.now() - dirtySince))));
    return () => window.clearTimeout(timer);
  }, [body, ownerId, ready, title]);

  function markChanged() {
    dirtySinceRef.current ??= Date.now();
  }

  async function discard() {
    await clearRhymeCreationDraft(ownerId).catch(() => undefined);
    router.push("/rhymes");
  }

  function requestCancel() {
    if (titleRef.current || bodyRef.current) setCancelOpen(true);
    else void discard();
  }

  const titleLength = [...title.trim()].length;
  const bodyLength = [...body].length;
  const titleError = ready && !title.trim() ? "제목을 입력하면 노트가 자동으로 생성됩니다." : titleLength > RHYME_LIMITS.title ? `제목은 ${RHYME_LIMITS.title}자 이하로 입력해 주세요.` : "";
  const bodyError = bodyLength > RHYME_LIMITS.body ? `본문은 ${RHYME_LIMITS.body.toLocaleString()}자 이하로 입력해 주세요.` : "";
  const stateLabel = !ready ? "로컬 초안을 불러오는 중…" : state === "creating" ? "노트를 생성하고 서버에 저장하는 중…" : state === "error" ? "이 기기에 임시 저장하지 못했습니다. 내용을 복사해 보관한 뒤 다시 시도해 주세요." : isOnline ? "이 기기에 임시 저장됨 · 유효한 제목을 입력하면 자동 저장됩니다" : "오프라인 · 이 기기에 임시 저장됨";

  return <section className="rhyme-new-page" aria-labelledby="new-rhyme-title">
    <header className="rhyme-editor-header"><div><button type="button" className="back-button" onClick={requestCancel}>← 라임 노트</button><p className="eyebrow">New rhyme note</p></div>
      <button type="button" className="secondary-button" onClick={requestCancel}>취소</button>
      <p className={`local-draft-state state-${state}`} role="status">{stateLabel}{state === "error" ? <button type="button" onClick={() => void createNow()}>다시 시도</button> : null}</p>
    </header>
    <div className="rhyme-editor-title"><label id="new-rhyme-title" htmlFor="new-rhyme-title-input">노트 제목</label>
      <input id="new-rhyme-title-input" autoFocus disabled={!ready || state === "creating"} value={title} aria-invalid={Boolean(titleError && titleLength > RHYME_LIMITS.title)}
        placeholder="떠오른 표현의 제목" onChange={(event) => { markChanged(); titleRef.current = event.target.value; setTitle(event.target.value); }} />
      <span className={titleLength > RHYME_LIMITS.title ? "over" : ""}>{titleLength.toLocaleString()} / {RHYME_LIMITS.title}</span>
      {titleError ? <small role={titleLength > RHYME_LIMITS.title ? "alert" : "status"}>{titleError}</small> : null}
    </div>
    <div className="rhyme-new-document"><label htmlFor="new-rhyme-body">자유 본문</label>
      <textarea id="new-rhyme-body" disabled={!ready || state === "creating"} value={body} aria-invalid={Boolean(bodyError)}
        placeholder={"air / chair / flare / rare\n\n형식 없이 단어와 표현을 기록하세요."}
        onChange={(event) => { markChanged(); bodyRef.current = event.target.value; setBody(event.target.value); }} />
      <footer><span>빈 본문 허용 · 줄바꿈 그대로 보존</span><span className={bodyError ? "over" : ""}>{bodyLength.toLocaleString()} / {RHYME_LIMITS.body.toLocaleString()}</span></footer>
      {bodyError ? <small role="alert">{bodyError}</small> : null}
    </div>
    {cancelOpen ? <div className="dialog-backdrop"><section className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="new-rhyme-cancel-title">
      <h2 id="new-rhyme-cancel-title">새 라임 노트 작성을 취소할까요?</h2><p>이 기기에 저장된 제목과 본문 초안도 함께 지워집니다.</p><div>
        <button type="button" autoFocus className="secondary-button" onClick={() => setCancelOpen(false)}>계속 작성</button>
        <button type="button" className="danger-button" onClick={() => void discard()}>초안 삭제 후 나가기</button>
      </div></section></div> : null}
  </section>;
}
