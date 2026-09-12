"use client";

import type { LyricRecord } from "@lyricscloud/domain";
import { useEffect, useState } from "react";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";

interface SharingIdentity { readonly sharingId: string; readonly displayName: string }
interface LyricReadGrant {
  readonly id: string;
  readonly sharingId: string;
  readonly displayName: string;
  readonly state: "active" | "revoked";
  readonly expiresAt: string | null;
}
interface Participant { readonly participantId: string; readonly displayName: string; readonly role: "owner" | "read" }

export function LyricShareManager({ lyric, participants }: { lyric: LyricRecord; participants: readonly Participant[] }) {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<SharingIdentity | null>(null);
  const [items, setItems] = useState<readonly LyricReadGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharingId, setSharingId] = useState("");
  const [duration, setDuration] = useState("none");
  const [notice, setNotice] = useState("");
  const copy = useCopyFeedback();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setNotice("");
    void Promise.all([
      fetch("/api/sharing/identity", { cache: "no-store" }),
      fetch(`/api/lyrics/${lyric.id}/shares`, { cache: "no-store" })
    ]).then(async ([identityResponse, grantsResponse]) => {
      if (!identityResponse.ok || !grantsResponse.ok) throw new Error();
      const own = await identityResponse.json() as { identity: SharingIdentity };
      const grants = await grantsResponse.json() as { items: LyricReadGrant[] };
      if (active) { setIdentity(own.identity); setItems(grants.items); }
    }).catch(() => { if (active) setNotice("공유 설정을 불러오지 못했습니다. 현재 가사와 기존 권한은 변경되지 않았습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lyric.id, open]);

  async function grant() {
    if (busy || !sharingId.trim()) return;
    setBusy(true); setNotice("");
    const expiresAt = duration === "none" ? null : new Date(Date.now() + Number(duration) * 86_400_000).toISOString();
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/shares`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharingId: sharingId.trim(), requestId: crypto.randomUUID(), expiresAt })
      });
      const result = await response.json().catch(() => ({})) as { grant?: LyricReadGrant; error?: { code?: string } };
      if (!response.ok || !result.grant) throw new Error(result.error?.code ?? "SHARE_FAILED");
      setItems((current) => [...current.filter((item) => item.id !== result.grant!.id), result.grant!]);
      setSharingId("");
      setNotice(`${result.grant.displayName}님에게 읽기 권한을 부여했습니다.`);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setNotice(code === "CONFLICT" ? "이미 다른 만료 조건으로 처리된 요청입니다. 목록을 새로 열어 확인해 주세요."
        : code === "VALIDATION_FAILED" ? "공유 코드를 확인해 주세요. 계정 이메일은 사용할 수 없습니다."
        : "공유하지 못했습니다. 코드가 틀렸거나 해당 계정을 선택할 수 없습니다.");
    } finally { setBusy(false); }
  }

  async function revoke(grantId: string) {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/shares/${grantId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => item.id === grantId ? { ...item, state: "revoked" } : item));
      setNotice("읽기 권한을 회수했습니다. 열려 있는 공유 화면도 곧 종료됩니다.");
    } catch { setNotice("권한을 회수하지 못했습니다. 기존 공유 상태는 그대로입니다."); }
    finally { setBusy(false); }
  }

  const activeItems = items.filter((item) => item.state === "active" && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()));
  const readerParticipants = participants.filter((item) => item.role === "read");
  const shareUrl = typeof window === "undefined" ? `/shared/lyrics/${lyric.id}` : `${window.location.origin}/shared/lyrics/${lyric.id}`;

  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>공유</button>
    {open ? <div className="dialog-backdrop sharing-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="sharing-dialog" role="dialog" aria-modal="true" aria-labelledby="sharing-title" aria-describedby="sharing-description">
        <DialogFocusBoundary selector=".sharing-dialog" onClose={() => setOpen(false)} blocked={busy} />
        <header><div><p className="eyebrow">Selected read</p><h2 id="sharing-title">가사 공유</h2></div><button type="button" disabled={busy} onClick={() => setOpen(false)}>닫기</button></header>
        <p id="sharing-description">선택한 LyricsCloud 계정만 이 가사의 제목·본문·상태를 읽습니다. 작업 메모, 연결 자료, 버전 기록과 내부 ID는 공유하지 않습니다.</p>
        {loading ? <p className="sharing-loading" role="status">공유 설정을 불러오는 중…</p> : <>
          <section className="sharing-mode" aria-label="현재 공유 상태"><span className={activeItems.length ? "selected" : "private"}>{activeItems.length ? "선택 공유" : "비공개"}</span><strong>{activeItems.length ? `${activeItems.length}명에게 읽기 허용` : "나만 볼 수 있음"}</strong></section>
          <section className="sharing-preview" aria-labelledby="sharing-preview-title"><div><p className="eyebrow">Preview</p><h3 id="sharing-preview-title">상대에게 보이는 내용</h3></div><dl><div><dt>제목</dt><dd>{lyric.title}</dd></div><div><dt>본문</dt><dd>{lyric.body ? `${lyric.body.slice(0, 120)}${lyric.body.length > 120 ? "…" : ""}` : "빈 가사"}</dd></div><div><dt>상태</dt><dd>{lyric.status}</dd></div></dl><p>공유 안 함: 작업 메모 · 연결 자료 · 버전 기록 · 삭제/ACL 액션</p></section>
          <section className="sharing-identity" aria-labelledby="sharing-code-title"><div><h3 id="sharing-code-title">내 공유 코드</h3><p>상대가 나에게 가사를 공유할 때 이 코드만 전달하세요. 이메일로 계정을 찾지 않습니다.</p></div>{identity ? <div><code>{identity.sharingId}</code><button type="button" onClick={() => void copy.copyText(identity.sharingId, "내 공유 코드", "내 공유 코드를 복사했습니다")}>복사</button></div> : <p>공유 코드를 확인할 수 없습니다.</p>}</section>
          <form className="sharing-grant" onSubmit={(event) => { event.preventDefault(); void grant(); }}><label><span>공유할 계정 코드</span><input value={sharingId} onChange={(event) => setSharingId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} /></label><label><span>읽기 권한 기간</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="none">회수할 때까지</option><option value="7">7일</option><option value="30">30일</option><option value="90">90일</option></select></label><button type="submit" className="primary-link" disabled={busy || !sharingId.trim()}>{busy ? "처리 중…" : "읽기 권한 부여"}</button></form>
          <section className="sharing-grants" aria-labelledby="sharing-grants-title"><div><h3 id="sharing-grants-title">허용된 계정</h3>{activeItems.length ? <button type="button" onClick={() => void copy.copyText(shareUrl, "공유 화면 링크", "공유 화면 링크를 복사했습니다")}>링크 복사</button> : null}</div>{activeItems.length ? <ul>{activeItems.map((item) => <li key={item.id}><span><strong>{item.displayName}</strong><small>{item.expiresAt ? `${new Date(item.expiresAt).toLocaleDateString("ko-KR")}까지` : "회수할 때까지"}</small></span><button type="button" className="danger-text" disabled={busy} onClick={() => void revoke(item.id)}>권한 회수</button></li>)}</ul> : <p>아직 읽기를 허용한 계정이 없습니다.</p>}</section>
          <section className="sharing-presence" aria-labelledby="sharing-presence-title"><h3 id="sharing-presence-title">현재 보는 사람</h3>{readerParticipants.length ? <ul>{readerParticipants.map((item) => <li key={item.participantId}><span aria-hidden="true" />{item.displayName}<small>읽기 전용</small></li>)}</ul> : <p>현재 이 가사를 보는 공유 사용자가 없습니다.</p>}</section>
        </>}
        {notice ? <p className="sharing-notice" role="status">{notice}</p> : null}
      </section>
    </div> : null}
    <CopyFeedback state={copy} />
  </>;
}
