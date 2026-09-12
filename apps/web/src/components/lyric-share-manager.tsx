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
interface Participant { readonly participantId: string; readonly displayName: string; readonly role: "owner" | "read" | "write" }
interface PublicLyricLink {
  readonly id: string;
  readonly state: "active" | "revoked";
  readonly fields: { readonly ownerDisplayName: boolean; readonly status: boolean; readonly updatedAt: boolean };
  readonly expiresAt: string;
}

export function LyricShareManager({ lyric, participants }: { lyric: LyricRecord; participants: readonly Participant[] }) {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<SharingIdentity | null>(null);
  const [items, setItems] = useState<readonly LyricReadGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharingId, setSharingId] = useState("");
  const [duration, setDuration] = useState("none");
  const [notice, setNotice] = useState("");
  const [publicItems, setPublicItems] = useState<readonly PublicLyricLink[]>([]);
  const [publicDuration, setPublicDuration] = useState<"1" | "7" | "30">("7");
  const [publicFields, setPublicFields] = useState({ ownerDisplayName: false, status: true, updatedAt: false });
  const [confirmingPublic, setConfirmingPublic] = useState(false);
  const [oneTimePublicUrl, setOneTimePublicUrl] = useState<string | null>(null);
  const copy = useCopyFeedback();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setNotice("");
    void Promise.all([
      fetch("/api/sharing/identity", { cache: "no-store" }),
      fetch(`/api/lyrics/${lyric.id}/shares`, { cache: "no-store" }),
      fetch(`/api/lyrics/${lyric.id}/public-link`, { cache: "no-store" })
    ]).then(async ([identityResponse, grantsResponse, publicResponse]) => {
      if (!identityResponse.ok || !grantsResponse.ok || !publicResponse.ok) throw new Error();
      const own = await identityResponse.json() as { identity: SharingIdentity };
      const grants = await grantsResponse.json() as { items: LyricReadGrant[] };
      const links = await publicResponse.json() as { items: PublicLyricLink[] };
      if (active) { setIdentity(own.identity); setItems(grants.items); setPublicItems(links.items); }
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

  async function issuePublicLink() {
    if (busy) return;
    setBusy(true); setNotice(""); setOneTimePublicUrl(null);
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/public-link`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID(),
          expiresInDays: Number(publicDuration), fields: publicFields }) });
      const result = await response.json().catch(() => ({})) as { link?: PublicLyricLink; url?: string | null; error?: { code?: string } };
      if (!response.ok || !result.link || typeof result.url !== "string") throw new Error(result.error?.code ?? "PUBLIC_LINK_FAILED");
      setPublicItems((current) => [result.link!, ...current.map((item) => item.state === "active" ? { ...item, state: "revoked" as const } : item)]);
      setOneTimePublicUrl(result.url); setConfirmingPublic(false);
      setNotice("공개 읽기 링크를 만들었습니다. 이 화면을 닫으면 링크 원문을 다시 볼 수 없습니다.");
    } catch (error) {
      setNotice(error instanceof Error && error.message === "RATE_LIMITED"
        ? "링크를 너무 자주 만들었습니다. 잠시 후 다시 시도해 주세요."
        : "공개 링크를 만들지 못했습니다. 기존 공개 상태는 변경되지 않았습니다.");
    } finally { setBusy(false); }
  }

  async function revokePublicLink(linkId: string) {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/public-link/${linkId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setPublicItems((current) => current.map((item) => item.id === linkId ? { ...item, state: "revoked" } : item));
      setOneTimePublicUrl(null); setConfirmingPublic(false);
      setNotice("공개 링크를 회수했습니다. 열려 있는 비로그인 화면도 곧 종료됩니다.");
    } catch { setNotice("공개 링크를 회수하지 못했습니다. 기존 상태는 그대로입니다."); }
    finally { setBusy(false); }
  }

  function closeDialog() { setOpen(false); setConfirmingPublic(false); setOneTimePublicUrl(null); }

  const activeItems = items.filter((item) => item.state === "active" && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()));
  const readerParticipants = participants.filter((item) => item.role === "read" || item.role === "write");
  const activePublic = publicItems.find((item) => item.state === "active" && new Date(item.expiresAt).getTime() > Date.now());
  const shareUrl = typeof window === "undefined" ? `/shared/lyrics/${lyric.id}` : `${window.location.origin}/shared/lyrics/${lyric.id}`;

  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>공유</button>
    {open ? <div className="dialog-backdrop sharing-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog(); }}>
      <section className="sharing-dialog" role="dialog" aria-modal="true" aria-labelledby="sharing-title" aria-describedby="sharing-description">
        <DialogFocusBoundary selector=".sharing-dialog" onClose={closeDialog} blocked={busy} />
        <header><div><p className="eyebrow">READ SHARING</p><h2 id="sharing-title">가사 공유</h2></div><button type="button" disabled={busy} onClick={closeDialog}>닫기</button></header>
        <p id="sharing-description">선택한 계정 또는 링크를 가진 사람에게 제목·본문과 선택한 필드만 읽기 전용으로 공개합니다. 작업 메모, 연결 자료, 버전 기록과 내부 ID는 공유하지 않습니다.</p>
        {loading ? <p className="sharing-loading" role="status">공유 설정을 불러오는 중…</p> : <>
          <section className="sharing-mode" aria-label="현재 공유 상태"><span className={activeItems.length ? "selected" : "private"}>{activeItems.length ? "선택 공유" : "비공개"}</span><strong>{activeItems.length ? `${activeItems.length}명에게 읽기 허용` : "나만 볼 수 있음"}</strong></section>
          <section className="sharing-preview" aria-labelledby="sharing-preview-title"><div><p className="eyebrow">Preview</p><h3 id="sharing-preview-title">상대에게 보이는 내용</h3></div><dl><div><dt>제목</dt><dd>{lyric.title}</dd></div><div><dt>본문</dt><dd>{lyric.body ? `${lyric.body.slice(0, 120)}${lyric.body.length > 120 ? "…" : ""}` : "빈 가사"}</dd></div><div><dt>상태</dt><dd>{lyric.status}</dd></div></dl><p>공유 안 함: 작업 메모 · 연결 자료 · 버전 기록 · 삭제/ACL 액션</p></section>
          <section className="sharing-identity" aria-labelledby="sharing-code-title"><div><h3 id="sharing-code-title">내 공유 코드</h3><p>상대가 나에게 가사를 공유할 때 이 코드만 전달하세요. 이메일로 계정을 찾지 않습니다.</p></div>{identity ? <div><code>{identity.sharingId}</code><button type="button" onClick={() => void copy.copyText(identity.sharingId, "내 공유 코드", "내 공유 코드를 복사했습니다")}>복사</button></div> : <p>공유 코드를 확인할 수 없습니다.</p>}</section>
          <form className="sharing-grant" onSubmit={(event) => { event.preventDefault(); void grant(); }}><label><span>공유할 계정 코드</span><input value={sharingId} onChange={(event) => setSharingId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} /></label><label><span>읽기 권한 기간</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="none">회수할 때까지</option><option value="7">7일</option><option value="30">30일</option><option value="90">90일</option></select></label><button type="submit" className="primary-link" disabled={busy || !sharingId.trim()}>{busy ? "처리 중…" : "읽기 권한 부여"}</button></form>
          <section className="sharing-grants" aria-labelledby="sharing-grants-title"><div><h3 id="sharing-grants-title">허용된 계정</h3>{activeItems.length ? <button type="button" onClick={() => void copy.copyText(shareUrl, "공유 화면 링크", "공유 화면 링크를 복사했습니다")}>링크 복사</button> : null}</div>{activeItems.length ? <ul>{activeItems.map((item) => <li key={item.id}><span><strong>{item.displayName}</strong><small>{item.expiresAt ? `${new Date(item.expiresAt).toLocaleDateString("ko-KR")}까지` : "회수할 때까지"}</small></span><button type="button" className="danger-text" disabled={busy} onClick={() => void revoke(item.id)}>권한 회수</button></li>)}</ul> : <p>아직 읽기를 허용한 계정이 없습니다.</p>}</section>
          <section className="sharing-public" aria-labelledby="sharing-public-title">
            <div><div><p className="eyebrow">PUBLIC LINK</p><h3 id="sharing-public-title">링크 공개 읽기</h3></div><span className={activePublic ? "public-active" : "private"}>{activePublic ? "링크 공개 중" : "비공개"}</span></div>
            <p>로그인하지 않은 사람도 링크를 가진 경우 선택한 기간 동안 읽을 수 있습니다. 검색·작업 공간·메모·연결 자료·버전 기록은 공개되지 않습니다.</p>
            {activePublic ? <div className="sharing-public-active"><strong>{new Date(activePublic.expiresAt).toLocaleString("ko-KR")}까지 공개</strong><span>공개 필드: 제목 · 본문{activePublic.fields.status ? " · 상태" : ""}{activePublic.fields.ownerDisplayName ? " · 공유자" : ""}{activePublic.fields.updatedAt ? " · 수정 시각" : ""}</span><button type="button" className="danger-text" disabled={busy} onClick={() => void revokePublicLink(activePublic.id)}>공개 링크 회수</button></div> : null}
            {oneTimePublicUrl ? <div className="sharing-public-once" role="status"><strong>지금 한 번만 링크를 복사할 수 있습니다</strong><p>주소에는 비밀 키가 포함됩니다. 신뢰하는 사람에게만 전달하세요.</p><button type="button" onClick={() => void copy.copyText(oneTimePublicUrl, "공개 읽기 링크", "공개 읽기 링크를 복사했습니다")}>공개 링크 복사</button></div> : null}
            {!confirmingPublic ? <button type="button" className="primary-link" disabled={busy} onClick={() => { setConfirmingPublic(true); setOneTimePublicUrl(null); }}>{activePublic ? "새 링크로 교체" : "공개 링크 만들기"}</button>
              : <div className="sharing-public-confirm" role="group" aria-labelledby="sharing-public-confirm-title"><strong id="sharing-public-confirm-title">공개 범위를 확인해 주세요</strong>
                <label><span>링크 유효 기간</span><select value={publicDuration} onChange={(event) => setPublicDuration(event.target.value as "1" | "7" | "30")}><option value="1">1일</option><option value="7">7일</option><option value="30">30일</option></select></label>
                <fieldset><legend>제목·본문 외 공개할 정보</legend><label><input type="checkbox" checked={publicFields.status} onChange={(event) => setPublicFields((value) => ({ ...value, status: event.target.checked }))} />가사 상태</label><label><input type="checkbox" checked={publicFields.ownerDisplayName} onChange={(event) => setPublicFields((value) => ({ ...value, ownerDisplayName: event.target.checked }))} />내 표시 이름</label><label><input type="checkbox" checked={publicFields.updatedAt} onChange={(event) => setPublicFields((value) => ({ ...value, updatedAt: event.target.checked }))} />마지막 수정 시각</label></fieldset>
                <p>{activePublic ? "확인하면 현재 링크는 즉시 무효화되고 새 링크로 교체됩니다." : "확인하면 링크를 가진 누구나 선택한 기간 동안 제목과 본문을 읽을 수 있습니다."}</p>
                <div><button type="button" disabled={busy} onClick={() => setConfirmingPublic(false)}>취소</button><button type="button" className="primary-link" disabled={busy} onClick={() => void issuePublicLink()}>{busy ? "처리 중…" : "확인하고 공개"}</button></div>
              </div>}
          </section>
          <section className="sharing-presence" aria-labelledby="sharing-presence-title"><h3 id="sharing-presence-title">현재 보는 사람</h3>{readerParticipants.length ? <ul>{readerParticipants.map((item) => <li key={item.participantId}><span aria-hidden="true" />{item.displayName}<small>{item.role === "write" ? "공동 작성" : "읽기 전용"}</small></li>)}</ul> : <p>현재 이 가사를 보는 공유 사용자가 없습니다.</p>}</section>
        </>}
        {notice ? <p className="sharing-notice" role="status">{notice}</p> : null}
      </section>
    </div> : null}
    <CopyFeedback state={copy} />
  </>;
}
