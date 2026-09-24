"use client";

import type { LyricRecord } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";
import { DialogFocusBoundary } from "../lib/dialog-focus.js";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";
import { SharingStorageGuide } from "./sharing-storage-guide.js";

interface SharingIdentity { readonly sharingId: string; readonly displayName: string }
interface LyricReadGrant {
  readonly id: string;
  readonly sharingId: string;
  readonly displayName: string;
  readonly state: "active" | "revoked";
  readonly permissionEpoch: number;
  readonly access: "read" | "write";
  readonly writeEpoch: number;
  readonly expiresAt: string | null;
}
interface Participant { readonly participantId: string; readonly displayName: string; readonly role: "owner" | "read" | "write" | "public-write";
  readonly activity: "active" | "idle"; readonly color: "lime" | "cyan" | "violet" | "orange";
  readonly selection?: { readonly anchor: number; readonly head: number; readonly from: number; readonly to: number } }
interface PublicLyricLink {
  readonly id: string;
  readonly state: "active" | "revoked";
  readonly access: "read" | "write";
  readonly writeEpoch: number;
  readonly writeConfirmedAt: string | null;
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
  const [confirmingPublicWrite, setConfirmingPublicWrite] = useState<string | null>(null);
  const [oneTimePublicUrl, setOneTimePublicUrl] = useState<string | null>(null);
  const pendingPublicRequest = useRef<{ requestId: string; expiresInDays: number; fields: typeof publicFields } | null>(null);
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

  async function setAccess(grant: LyricReadGrant, access: "read" | "write") {
    if (busy || grant.access === access) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/shares/${grant.id}`, { method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access, requestId: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({})) as { grant?: LyricReadGrant };
      if (!response.ok || !result.grant) throw new Error();
      setItems((current) => current.map((item) => item.id === grant.id ? result.grant! : item));
      setNotice(`${result.grant.displayName}님을 ${access === "write" ? "공동 작성자" : "읽기 전용"}로 변경했습니다.`);
    } catch { setNotice("권한을 변경하지 못했습니다. 기존 읽기·쓰기 상태는 그대로입니다."); }
    finally { setBusy(false); }
  }

  async function issuePublicLink() {
    if (busy) return;
    setBusy(true); setNotice(""); setOneTimePublicUrl(null);
    const input = pendingPublicRequest.current ?? { requestId: crypto.randomUUID(),
      expiresInDays: Number(publicDuration), fields: { ...publicFields } };
    pendingPublicRequest.current = input;
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/public-link`, { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json().catch(() => ({})) as { link?: PublicLyricLink; url?: string | null;
        replayed?: boolean; error?: { code?: string } };
      if (!response.ok || !result.link) {
        if (response.status === 400 || response.status === 409) pendingPublicRequest.current = null;
        throw new Error(result.error?.code ?? "PUBLIC_LINK_FAILED");
      }
      setPublicItems((current) => [result.link!, ...current.map((item) => item.state === "active" ? { ...item, state: "revoked" as const } : item)]);
      pendingPublicRequest.current = null;
      setConfirmingPublic(false);
      if (result.replayed || typeof result.url !== "string") {
        setNotice("링크 생성은 완료됐지만 주소 원문은 다시 볼 수 없습니다. 주소가 필요하면 새 링크로 교체하세요. 그러면 이전 링크는 무효화됩니다.");
      } else {
        setOneTimePublicUrl(result.url);
        setNotice("공개 읽기 링크를 만들었습니다. 이 화면을 닫으면 링크 원문을 다시 볼 수 없습니다.");
      }
    } catch (error) {
      setNotice(error instanceof Error && error.message === "RATE_LIMITED"
        ? "링크를 너무 자주 만들었습니다. 잠시 후 다시 시도해 주세요."
        : "응답을 확인하지 못했습니다. 같은 요청으로 다시 확인할 수 있습니다. 기존 공개 상태를 단정할 수 없습니다.");
    } finally { setBusy(false); }
  }

  async function revokePublicLink(linkId: string) {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/public-link/${linkId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setPublicItems((current) => current.map((item) => item.id === linkId ? { ...item, state: "revoked" } : item));
      setOneTimePublicUrl(null); setConfirmingPublic(false); setConfirmingPublicWrite(null);
      setNotice("공개 링크를 회수했습니다. 열려 있는 비로그인 화면도 곧 종료됩니다.");
    } catch { setNotice("공개 링크를 회수하지 못했습니다. 기존 상태는 그대로입니다."); }
    finally { setBusy(false); }
  }

  async function setPublicAccess(link: PublicLyricLink, access: "read" | "write") {
    if (busy || link.access === access) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/public-link/${link.id}`, { method: "PATCH",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID(), access,
          ...(access === "write" ? { confirmation: "public-guest-write-v1" } : {}) }) });
      const result = await response.json().catch(() => ({})) as { link?: PublicLyricLink; error?: { code?: string } };
      if (!response.ok || !result.link) throw new Error(result.error?.code ?? "PUBLIC_ACCESS_FAILED");
      setPublicItems((current) => current.map((item) => item.id === link.id ? result.link! : item));
      setConfirmingPublicWrite(null);
      setNotice(access === "write"
        ? "비로그인 게스트 쓰기를 허용했습니다. 링크를 가진 누구나 새 게스트 세션으로 본문을 수정할 수 있습니다."
        : "게스트 쓰기를 중지했습니다. 공개 읽기는 유지되며 이전 게스트 세션은 다시 쓸 수 없습니다.");
    } catch (error) {
      setNotice(error instanceof Error && error.message === "CONFLICT"
        ? "선택 공유 독자가 있는 동안 공개 쓰기를 함께 켤 수 없습니다. 선택 권한을 먼저 회수해 주세요. 기존 상태는 그대로입니다."
        : "공개 읽기·쓰기 상태를 변경하지 못했습니다. 기존 상태는 그대로입니다.");
    }
    finally { setBusy(false); }
  }

  function closeDialog() { setOpen(false); setConfirmingPublic(false); setConfirmingPublicWrite(null); setOneTimePublicUrl(null); }

  const activeItems = items.filter((item) => item.state === "active" && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()));
  const readerParticipants = participants.filter((item) => item.role === "read" || item.role === "write" || item.role === "public-write");
  const activePublic = publicItems.find((item) => item.state === "active" && new Date(item.expiresAt).getTime() > Date.now());
  const shareUrl = typeof window === "undefined" ? `/shared/lyrics/${lyric.id}` : `${window.location.origin}/shared/lyrics/${lyric.id}`;

  return <>
    <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>공유</button>
    {open ? <div className="dialog-backdrop sharing-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) closeDialog(); }}>
      <section className="sharing-dialog" role="dialog" aria-modal="true" aria-labelledby="sharing-title" aria-describedby="sharing-description">
        <DialogFocusBoundary selector=".sharing-dialog" onClose={closeDialog} blocked={busy} />
        <header><div><p className="eyebrow">READ SHARING</p><h2 id="sharing-title">가사 공유</h2></div><button type="button" disabled={busy} onClick={closeDialog}>닫기</button></header>
        <p id="sharing-description">선택한 계정과 공개 링크의 읽기·본문 쓰기를 관리합니다. 작업 메모, 연결 자료, 버전 기록, 삭제·권한 관리는 공유하지 않습니다.</p>
        {loading ? <p className="sharing-loading" role="status">공유 설정을 불러오는 중…</p> : <>
          <section className="sharing-mode" aria-label="현재 공유 상태"><span className={activeItems.length ? "selected" : "private"}>{activeItems.length ? "선택 공유" : "비공개"}</span><strong>{activeItems.length ? `${activeItems.length}명에게 읽기 허용 · ${activeItems.filter((item) => item.access === "write").length}명 공동 작성` : "나만 볼 수 있음"}</strong></section>
          <SharingStorageGuide audience="owner" />
          <section className="sharing-preview" aria-labelledby="sharing-preview-title"><div><p className="eyebrow">Preview</p><h3 id="sharing-preview-title">상대에게 보이는 내용</h3></div><dl><div><dt>제목</dt><dd>{lyric.title}</dd></div><div><dt>본문</dt><dd>{lyric.body ? `${lyric.body.slice(0, 120)}${lyric.body.length > 120 ? "…" : ""}` : "빈 가사"}</dd></div><div><dt>상태</dt><dd>{lyric.status}</dd></div></dl><p>공유 안 함: 작업 메모 · 연결 자료 · 버전 기록 · 삭제/ACL 액션</p></section>
          <section className="sharing-identity" aria-labelledby="sharing-code-title"><div><h3 id="sharing-code-title">내 공유 코드</h3><p>상대가 나에게 가사를 공유할 때 이 코드만 전달하세요. 이메일로 계정을 찾지 않습니다.</p></div>{identity ? <div><code>{identity.sharingId}</code><button type="button" onClick={() => void copy.copyText(identity.sharingId, "내 공유 코드", "내 공유 코드를 복사했습니다")}>복사</button></div> : <p>공유 코드를 확인할 수 없습니다.</p>}</section>
          <form className="sharing-grant" onSubmit={(event) => { event.preventDefault(); void grant(); }}><label><span>공유할 계정 코드</span><input value={sharingId} onChange={(event) => setSharingId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" spellCheck={false} /></label><label><span>읽기 권한 기간</span><select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="none">회수할 때까지</option><option value="7">7일</option><option value="30">30일</option><option value="90">90일</option></select></label><button type="submit" className="primary-link" disabled={busy || !sharingId.trim()}>{busy ? "처리 중…" : "읽기 권한 부여"}</button></form>
          <section className="sharing-grants" aria-labelledby="sharing-grants-title"><div><h3 id="sharing-grants-title">허용된 계정</h3>{activeItems.length ? <button type="button" onClick={() => void copy.copyText(shareUrl, "공유 화면 링크", "공유 화면 링크를 복사했습니다")}>링크 복사</button> : null}</div>{activeItems.length ? <ul>{activeItems.map((item) => <li key={item.id}><span><strong>{item.displayName}</strong><small>{item.access === "write" ? "공동 작성" : "읽기 전용"} · {item.expiresAt ? `${new Date(item.expiresAt).toLocaleDateString("ko-KR")}까지` : "회수할 때까지"}</small></span><div className="sharing-grant-actions"><button type="button" disabled={busy} onClick={() => void setAccess(item, item.access === "write" ? "read" : "write")}>{item.access === "write" ? "읽기 전용으로 변경" : "공동 작성 허용"}</button><button type="button" className="danger-text" disabled={busy} onClick={() => void revoke(item.id)}>권한 회수</button></div></li>)}</ul> : <p>아직 읽기를 허용한 계정이 없습니다.</p>}</section>
          <section className="sharing-public" aria-labelledby="sharing-public-title">
            <div><div><p className="eyebrow">PUBLIC LINK</p><h3 id="sharing-public-title">링크 공개 읽기·쓰기</h3></div><span className={activePublic ? "public-active" : "private"}>{activePublic ? (activePublic.access === "write" ? "게스트 쓰기 허용" : "링크 공개 중 · 읽기 전용") : "비공개"}</span></div>
            <p>로그인하지 않은 사람도 링크를 가진 경우 선택한 기간 동안 읽을 수 있습니다. 별도 확인 후 본문 쓰기를 허용할 수 있지만 검색·작업 공간·메모·연결 자료·버전 기록·삭제·권한 관리는 공개되지 않습니다.</p>
            {activePublic ? <div className="sharing-public-active"><strong>{new Date(activePublic.expiresAt).toLocaleString("ko-KR")}까지 공개</strong><span>공개 필드: 제목 · 본문{activePublic.fields.status ? " · 상태" : ""}{activePublic.fields.ownerDisplayName ? " · 공유자" : ""}{activePublic.fields.updatedAt ? " · 수정 시각" : ""}</span>
              <div className="sharing-public-access" role="group" aria-label="공개 링크 접근 방식">
                <button type="button" aria-pressed={activePublic.access === "read"} disabled={busy || activePublic.access === "read"} onClick={() => void setPublicAccess(activePublic, "read")}><strong>공개 읽기</strong><small>링크 소지자는 보기·복사만 가능</small></button>
                <button type="button" aria-pressed={activePublic.access === "write"} disabled={busy || activePublic.access === "write"} onClick={() => setConfirmingPublicWrite(activePublic.id)}><strong>공개 읽기 + 비로그인 쓰기</strong><small>링크 소지자는 새 게스트 세션으로 본문 수정 가능</small></button>
              </div>
              {confirmingPublicWrite === activePublic.id ? <div className="sharing-public-write-risk" role="group" aria-labelledby="public-write-risk-title" aria-describedby="public-write-risk-description">
                <strong id="public-write-risk-title">비로그인 게스트 쓰기 위험을 확인해 주세요</strong>
                <p id="public-write-risk-description">링크를 가진 누구나 계정 없이 새 게스트 세션을 만들고 가사 본문을 수정할 수 있습니다. 표시 이름은 임의의 게스트 번호이며 실제 사람을 식별하지 못합니다. 변경은 서버에 저장되고 소유자 복구 기록에 남습니다.</p>
                <ul><li>선택 공유 독자가 있으면 공개 쓰기를 함께 켤 수 없습니다.</li><li>쓰기 중지는 즉시 적용되며 공개 읽기는 유지됩니다.</li><li>이미 받은 링크나 복사한 내용까지 회수할 수는 없습니다.</li><li>작업 메모·연결 자료·버전 복원·삭제·권한 관리는 게스트에게 열리지 않습니다.</li></ul>
                <div><button type="button" disabled={busy} onClick={() => setConfirmingPublicWrite(null)}>취소</button><button type="button" className="primary-link" disabled={busy} onClick={() => void setPublicAccess(activePublic, "write")}>{busy ? "처리 중…" : "위험을 이해하고 쓰기 허용"}</button></div>
              </div> : null}
              <button type="button" className="danger-text" disabled={busy} onClick={() => void revokePublicLink(activePublic.id)}>공개 링크 회수</button></div> : null}
            {oneTimePublicUrl ? <div className="sharing-public-once" role="status"><strong>지금 한 번만 링크를 복사할 수 있습니다</strong><p>주소에는 비밀 키가 포함됩니다. 신뢰하는 사람에게만 전달하세요.</p><button type="button" onClick={() => void copy.copyText(oneTimePublicUrl, "공개 읽기 링크", "공개 읽기 링크를 복사했습니다")}>공개 링크 복사</button></div> : null}
            {!confirmingPublic ? <button type="button" className="primary-link" disabled={busy} onClick={() => { setConfirmingPublic(true); setOneTimePublicUrl(null); }}>{activePublic ? "새 링크로 교체" : "공개 링크 만들기"}</button>
              : <div className="sharing-public-confirm" role="group" aria-labelledby="sharing-public-confirm-title"><strong id="sharing-public-confirm-title">공개 범위를 확인해 주세요</strong>
                <label><span>링크 유효 기간</span><select value={publicDuration} disabled={busy || Boolean(pendingPublicRequest.current)} onChange={(event) => setPublicDuration(event.target.value as "1" | "7" | "30")}><option value="1">1일</option><option value="7">7일</option><option value="30">30일</option></select></label>
                <fieldset><legend>제목·본문 외 공개할 정보</legend><label><input type="checkbox" checked={publicFields.status} disabled={busy || Boolean(pendingPublicRequest.current)} onChange={(event) => setPublicFields((value) => ({ ...value, status: event.target.checked }))} />가사 상태</label><label><input type="checkbox" checked={publicFields.ownerDisplayName} disabled={busy || Boolean(pendingPublicRequest.current)} onChange={(event) => setPublicFields((value) => ({ ...value, ownerDisplayName: event.target.checked }))} />내 표시 이름</label><label><input type="checkbox" checked={publicFields.updatedAt} disabled={busy || Boolean(pendingPublicRequest.current)} onChange={(event) => setPublicFields((value) => ({ ...value, updatedAt: event.target.checked }))} />마지막 수정 시각</label></fieldset>
                <p>{activePublic ? "확인하면 현재 링크는 즉시 무효화되고 새 링크로 교체됩니다." : "확인하면 링크를 가진 누구나 선택한 기간 동안 제목과 본문을 읽을 수 있습니다."}</p>
                <div><button type="button" disabled={busy} onClick={() => setConfirmingPublic(false)}>취소</button><button type="button" className="primary-link" disabled={busy} onClick={() => void issuePublicLink()}>{busy ? "처리 중…" : "확인하고 공개"}</button></div>
              </div>}
          </section>
          <section className="sharing-presence" aria-labelledby="sharing-presence-title"><h3 id="sharing-presence-title">현재 보는 사람</h3>{readerParticipants.length ? <ul>{readerParticipants.map((item) => <li key={item.participantId} className={`activity-${item.activity}`}><span aria-hidden="true" data-presence-color={item.color} />{item.displayName}<small>{participantDetail(item)}</small></li>)}</ul> : <p>현재 이 가사를 보는 공유 사용자가 없습니다.</p>}</section>
        </>}
        {notice ? <p className="sharing-notice" role="status">{notice}</p> : null}
      </section>
    </div> : null}
    <CopyFeedback state={copy} />
  </>;
}

function participantDetail(item: Participant): string {
  const role = item.role === "public-write" ? "공개 게스트" : item.role === "write" ? "공동 작성" : "읽기 전용";
  if (!item.selection) return `${role} · 연결됨`;
  const position = item.selection.from === item.selection.to
    ? `${item.selection.head + 1}번째 글자` : `${item.selection.from + 1}–${item.selection.to + 1}번째 구간`;
  return `${role} · ${item.activity === "active" ? "작업 중" : "자리 비움"} · ${position}`;
}
