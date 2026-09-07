"use client";

import { readQuickCreationDraft, type QuickCreationDraft } from "@lyricscloud/editor";
import { useEffect, useRef, useState } from "react";
import { buildQuickCreationDraft, persistAndCreateQuickIdea } from "../lib/quick-create.js";

export function QuickAdd({ ownerId, currentSongId }: { ownerId: string; currentSongId?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickCreationDraft["kind"]>("rhyme_note");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [returnTo, setReturnTo] = useState("/workspace");
  const [busy, setBusy] = useState(false);
  const [recoveredHref, setRecoveredHref] = useState("");
  const requestId = useRef("");
  const pending = useRef<Promise<void> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function retryDraft(draft: QuickCreationDraft, navigate: boolean) {
    if (pending.current) return pending.current;
    const task = (async () => {
      setBusy(true);
      try {
        const href = await persistAndCreateQuickIdea(ownerId, draft);
        if (!href) {
          setNotice("오프라인 초안을 이 기기에 저장했습니다. 연결되면 같은 요청으로 한 번만 생성합니다.");
          setOpen(false);
          return;
        }
        setRecoveredHref(href);
        setNotice("빠른 아이디어를 저장했습니다.");
        setBody(""); requestId.current = crypto.randomUUID(); setOpen(false);
        if (navigate) window.location.assign(href);
      } catch {
        setNotice("빠른 아이디어를 서버에 저장하지 못했습니다. 이 기기의 초안은 보존되며 다시 연결할 때 재시도합니다.");
      } finally { setBusy(false); pending.current = null; }
    })();
    pending.current = task;
    return task;
  }

  useEffect(() => {
    let active = true;
    requestId.current ||= crypto.randomUUID();
    const recover = () => {
      void readQuickCreationDraft(ownerId).then((draft) => {
        if (!active || !draft) return;
        requestId.current = draft.requestId;
        setKind(draft.kind); setBody(draft.body);
        setNotice(navigator.onLine ? "보존된 빠른 아이디어를 서버와 동기화하고 있습니다." : "오프라인 빠른 아이디어가 이 기기에 보존되어 있습니다.");
        if (navigator.onLine) void retryDraft(draft, false);
      }).catch(() => setNotice("이 기기의 빠른 아이디어 초안을 확인하지 못했습니다."));
    };
    recover();
    const online = () => recover();
    window.addEventListener("online", online);
    return () => { active = false; window.removeEventListener("online", online); };
  }, [ownerId]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", escape); };
  }, [open]);

  function show() {
    setReturnTo(`${window.location.pathname}${window.location.search}`);
    setOpen(true);
  }

  function create() {
    if (busy) return;
    try {
      requestId.current ||= crypto.randomUUID();
      const draft = buildQuickCreationDraft(kind, body, requestId.current);
      void retryDraft(draft, true);
    } catch {
      setNotice("아이디어를 입력해 주세요. 프롬프트는 쉼표나 줄바꿈으로 나눈 표현마다 200자 이하여야 합니다.");
    }
  }

  const lyricHref = `/lyrics/new?returnTo=${encodeURIComponent(returnTo)}${currentSongId ? `&songId=${encodeURIComponent(currentSongId)}` : ""}`;
  return <>
    <button type="button" className="top-quick-add" aria-haspopup="dialog" aria-expanded={open} onClick={show}>＋ 빠른 추가</button>
    <a className="quick-add" href="/songs/new" aria-label="빠른 추가 열기 · 새 곡 추가" aria-haspopup="dialog" aria-expanded={open}
      onClick={(event) => { event.preventDefault(); show(); }}><span>＋</span><small>빠른 추가</small></a>
    {notice ? <p className="quick-add-notice" role="status">{notice}{recoveredHref ? <> <a href={recoveredHref}>열기</a></> : null}</p> : null}
    {open ? <div className="dialog-backdrop quick-add-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="quick-add-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
        <header><div><p className="eyebrow">Global capture</p><h2 id="quick-add-title">빠른 추가</h2></div><button type="button" disabled={busy} onClick={() => setOpen(false)}>닫기</button></header>
        <nav className="quick-add-types" aria-label="새 자료 유형">
          <a href={`/songs/new?returnTo=${encodeURIComponent(returnTo)}`}><span>♪</span><strong>새 곡</strong><small>곡 정보 입력</small></a>
          <a href={lyricHref}><span>≋</span><strong>새 가사</strong><small>{currentSongId ? "현재 곡에서 시작" : "부모 곡 선택"}</small></a>
          <a href="/rhymes/new"><span>≈</span><strong>새 라임</strong><small>자유 노트 편집</small></a>
          <a href="/prompts/new"><span>◇</span><strong>새 프롬프트</strong><small>태그 조합 편집</small></a>
        </nav>
        <div className="quick-idea-capture">
          <div><strong>빠른 아이디어</strong><span>제목과 곡 연결은 나중에 보완할 수 있습니다.</span></div>
          <label><span>저장 유형</span><select value={kind} onChange={(event) => setKind(event.target.value as QuickCreationDraft["kind"])}><option value="rhyme_note">라임 노트</option><option value="prompt">프롬프트</option></select></label>
          <textarea ref={inputRef} value={body} onChange={(event) => { setBody(event.target.value); setNotice(""); }} placeholder="떠오른 한 줄을 바로 적어 두세요" />
          <button type="button" className="primary-link" disabled={busy || !body.trim()} onClick={create}>{busy ? "저장 중…" : navigator.onLine ? "아이디어 저장" : "오프라인 초안 저장"}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
