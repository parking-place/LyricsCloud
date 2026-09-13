"use client";

import { createBrowserPublicSharedLyricSync, createCodeMirrorTextEditor,
  type BrowserPublicSharedLyricSync, type CodeMirrorTextEditor, type PublicGuestSessionAccess,
  type PublicSharedLyricAccess, type RejectedWriterDraft, type SharingParticipant,
  type SharedLyricSyncState } from "@lyricscloud/editor";
import { LYRIC_STATUS_LABELS, type LyricStatus } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";

interface PublicLyric {
  readonly linkId: string;
  readonly title: string;
  readonly body: string;
  readonly status?: LyricStatus;
  readonly updatedAt?: string;
  readonly ownerDisplayName?: string;
  readonly permissionEpoch: number;
  readonly access: "read" | "write";
  readonly writeEpoch: number;
  readonly expiresAt: string;
}

interface PublicConnectionInput {
  readonly token: string;
  readonly linkId: string;
  readonly guestSession?: PublicGuestSessionAccess;
}

const tokenKey = "lyricscloud:public-share-token:v1";
const guestSessionKey = "lyricscloud:public-guest-session:v1";

export function PublicSharedLyricViewer() {
  const sync = useRef<BrowserPublicSharedLyricSync | null>(null);
  const editor = useRef<CodeMirrorTextEditor | null>(null);
  const editorParent = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef("");
  const accessRef = useRef<PublicSharedLyricAccess>({ mode: "read", permissionEpoch: 0 });
  const [connection, setConnection] = useState<PublicConnectionInput | null>(null);
  const [lyric, setLyric] = useState<PublicLyric | null>(null);
  const [body, setBody] = useState("");
  const [access, setAccess] = useState<PublicSharedLyricAccess>({ mode: "read", permissionEpoch: 0 });
  const [state, setState] = useState<SharedLyricSyncState>("connecting");
  const [participants, setParticipants] = useState<readonly SharingParticipant[]>([]);
  const [rejectedDrafts, setRejectedDrafts] = useState<readonly RejectedWriterDraft[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [sessionNotice, setSessionNotice] = useState("");
  const copy = useCopyFeedback();

  function downloadDraft(draft: RejectedWriterDraft) {
    const url = URL.createObjectURL(new Blob([draft.authoredText], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `lyricscloud-guest-recovery-${draft.rejectedAt.slice(0, 10)}.txt`; anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function consumeCapability() {
      const current = ++generation;
      void sync.current?.destroy(); sync.current = null;
      editor.current?.destroy(); editor.current = null;
      setConnection(null); setLyric(null); setBody(""); bodyRef.current = "";
      setUnavailable(false); setSessionNotice(""); setState("connecting"); setParticipants([]);
      const fragment = location.hash.startsWith("#") ? location.hash.slice(1) : "";
      const freshOpen = Boolean(fragment);
      if (fragment) { sessionStorage.setItem(tokenKey, fragment); sessionStorage.removeItem(guestSessionKey); }
      history.replaceState(history.state, "", `${location.pathname}${location.search}`);
      const token = fragment || sessionStorage.getItem(tokenKey) || "";
      const storedGuest = parseStoredGuestSession(sessionStorage.getItem(guestSessionKey));
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setUnavailable(true); setState("revoked"); return; }
      try {
        const response = await fetch("/api/public/shared-lyric", { method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (!response.ok) throw new Error("PUBLIC_SHARE_UNAVAILABLE");
        const result = await response.json() as { lyric?: PublicLyric };
        if (!result.lyric) throw new Error("PUBLIC_SHARE_UNAVAILABLE");
        const nextLyric = result.lyric;
        let guestSession = !freshOpen && storedGuest?.linkId === nextLyric.linkId ? storedGuest : undefined;
        if (nextLyric.access === "write" && (!guestSession
          || guestSession.permissionEpoch !== nextLyric.permissionEpoch || guestSession.writeEpoch !== nextLyric.writeEpoch
          || new Date(guestSession.expiresAt).getTime() <= Date.now())) {
          const sessionResponse = await fetch("/api/public/shared-lyric/session", { method: "POST", cache: "no-store",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
          const sessionResult = await sessionResponse.json().catch(() => ({})) as {
            session?: Omit<PublicGuestSessionAccess, "token" | "recoveryId"> & { linkId: string }; token?: string;
          };
          if (sessionResponse.ok && sessionResult.session && typeof sessionResult.token === "string") {
            guestSession = { ...sessionResult.session, token: sessionResult.token,
              recoveryId: storedGuest?.linkId === nextLyric.linkId ? storedGuest.recoveryId : crypto.randomUUID() };
            sessionStorage.setItem(guestSessionKey, JSON.stringify(guestSession));
          } else {
            guestSession = undefined;
            setSessionNotice(sessionResponse.status === 429
              ? "게스트 쓰기 연결 요청이 많습니다. 잠시 뒤 다시 시도해 주세요. 지금은 읽기 전용입니다."
              : "게스트 쓰기 연결을 만들지 못했습니다. 가사는 읽기 전용으로 열었습니다.");
          }
        }
        if (!active || generation !== current) return;
        const initialAccess: PublicSharedLyricAccess = guestSession && nextLyric.access === "write"
          ? { mode: "write", permissionEpoch: nextLyric.permissionEpoch, writeEpoch: nextLyric.writeEpoch,
              guestSessionId: guestSession.id, displayName: guestSession.displayName }
          : { mode: "read", permissionEpoch: nextLyric.permissionEpoch };
        accessRef.current = initialAccess; setAccess(initialAccess);
        bodyRef.current = nextLyric.body; setBody(nextLyric.body); setLyric(nextLyric);
        setConnection({ token, linkId: nextLyric.linkId, ...(guestSession ? { guestSession } : {}) });
      } catch {
        if (!active || generation !== current) return;
        sessionStorage.removeItem(tokenKey); setUnavailable(true); setState("revoked");
        if (storedGuest) setConnection({ token, linkId: storedGuest.linkId, guestSession: storedGuest });
      }
    }
    const onHashChange = () => { void consumeCapability(); };
    window.addEventListener("hashchange", onHashChange); void consumeCapability();
    return () => { active = false; generation++; window.removeEventListener("hashchange", onHashChange);
      void sync.current?.destroy(); sync.current = null; editor.current?.destroy(); editor.current = null; };
  }, []);

  useEffect(() => {
    if (!connection) return;
    let active = true;
    const parent = editorParent.current;
    const textEditor = parent ? createCodeMirrorTextEditor({ parent, initialValue: bodyRef.current,
      ariaLabel: "공유된 가사 본문", placeholder: "아직 입력된 가사가 없습니다.", readOnly: accessRef.current.mode !== "write",
      onChange(value) { bodyRef.current = value; if (active) setBody(value); },
      onCompositionStart() { sync.current?.setComposing(true); },
      onCompositionEnd() { sync.current?.setComposing(false); },
      onSelectionChange(selection) { sync.current?.updateSelection(selection); },
      onTransaction(transaction) { sync.current?.applyLocalTransaction(transaction); }
    }) : null;
    editor.current = textEditor;
    void createBrowserPublicSharedLyricSync({ ...connection,
      onBody(value, changes) {
        if (!active || value === bodyRef.current) return;
        const currentLength = editor.current?.value.length ?? 0;
        bodyRef.current = value; setBody(value);
        editor.current?.applyTransaction({ changes: changes ?? [{ from: 0, to: currentLength, insert: value }] });
      },
      onStateChange(value) {
        if (!active) return;
        setState(value);
        textEditor?.setEditable(accessRef.current.mode === "write" && value !== "limited" && value !== "revoked");
        if (value === "revoked") {
          sessionStorage.removeItem(tokenKey);
          setUnavailable(true);
          setLyric(null);
        }
      },
      onAccessChange(value) { if (active) { accessRef.current = value; setAccess(value); textEditor?.setEditable(value.mode === "write"); } },
      onPresenceChange(value) { if (active) setParticipants(value); },
      onRejectedDrafts(value) { if (active) setRejectedDrafts(value); }
    }).then((value) => { if (active) sync.current = value; else void value.destroy(); });
    return () => { active = false; textEditor?.finishComposition(); textEditor?.destroy(); editor.current = null;
      void sync.current?.destroy(); sync.current = null; };
  }, [connection]);

  const recovery = rejectedDrafts.length ? <section className="shared-writer-recovery" aria-labelledby="public-recovery-title">
    <div><p className="eyebrow">LOCAL RECOVERY</p><h2 id="public-recovery-title">전송되지 않은 내 작성 내용</h2></div>
    <p>서버에 반영되지 않은 이 게스트 세션의 입력만 보관했습니다. 다른 사람의 가사나 작업 공간 정보는 포함하지 않습니다.</p>
    <p>복구함은 현재 탭의 게스트 세션에만 연결됩니다. 항목별 제거 또는 브라우저의 사이트 데이터 삭제로 정리할 수 있으며, 탭을 닫으면 다시 열 수 없습니다.</p>
    <ul>{rejectedDrafts.map((draft) => <li key={draft.updateId}><pre>{draft.authoredText || "(전송되지 않은 삭제 동작)"}</pre><div>{draft.authoredText ? <><button type="button" onClick={() => void copy.copyText(draft.authoredText, "미전송 게스트 입력", "미전송 입력을 복사했습니다")}>내용 복사</button><button type="button" onClick={() => downloadDraft(draft)}>텍스트 파일 저장</button></> : null}<button type="button" className="danger-text" onClick={() => void sync.current?.removeRejectedDraft(draft.updateId)}>보관함에서 제거</button></div></li>)}</ul>
  </section> : null;

  if (unavailable) return <section className="public-share-card public-share-unavailable" aria-labelledby="public-share-unavailable-title">
    <p className="eyebrow">SHARING ENDED</p><h1 id="public-share-unavailable-title">공유 가사를 열 수 없습니다</h1>
    <p>링크가 만료·회수되었거나 올바르지 않을 수 있습니다. 자료의 존재 여부는 별도로 표시하지 않습니다.</p>
    {recovery}<CopyFeedback state={copy} />
  </section>;

  if (!lyric) return <section className="public-share-card" aria-labelledby="public-share-loading-title">
    <p className="eyebrow">SHARED LYRICS</p><h1 id="public-share-loading-title">공유 가사</h1>
    <p role="status">안전한 공유 링크를 확인하는 중…</p>
  </section>;

  const writable = access.mode === "write" && state !== "limited";
  const visibleParticipants = participants.filter((item) => item.role === "public-write");
  return <article className="public-share-card public-shared-lyric" aria-labelledby="public-shared-title">
    <header><div><p className="eyebrow">{writable ? "PUBLIC GUEST WRITE" : "PUBLIC READ"}</p><h1 id="public-shared-title">{lyric.title}</h1>
      <p>{[lyric.ownerDisplayName ? `${lyric.ownerDisplayName}님이 공유함` : null,
        lyric.status ? LYRIC_STATUS_LABELS[lyric.status] : null].filter(Boolean).join(" · ") || "링크로 공유됨"}</p></div>
      <div className={`shared-read-badge access-${writable ? "write" : "read"}`}><strong>{writable ? "게스트 공동 작성" : "읽기 전용"}</strong><small>{writable ? `${access.displayName ?? "게스트"} · 본문만 작성 가능` : "링크 소지자만 열람"}</small></div></header>
    {sessionNotice ? <p className="sharing-notice" role="status">{sessionNotice}</p> : null}
    <div className={`shared-live-state state-${state}`} role="status" aria-live="polite"><span aria-hidden="true" />
      {state === "live" ? (writable ? "실시간으로 연결됨 · 모든 변경 저장됨" : "실시간으로 연결됨")
        : state === "saving-local" ? "이 기기에 입력을 저장하는 중…"
        : state === "syncing" ? "서버에 변경을 저장하는 중…"
        : state === "offline" ? (writable ? "오프라인 · 입력은 이 게스트 세션에만 보관됩니다" : "오프라인 · 마지막으로 받은 내용을 표시 중")
        : state === "limited" ? "쓰기 제한에 도달했습니다 · 미전송 입력은 아래에서 복구할 수 있습니다"
        : state === "error" ? "실시간 연결을 확인하지 못했습니다" : "최신 내용과 권한을 확인하는 중…"}
      {state === "error" || state === "limited" ? <button type="button" onClick={() => sync.current?.retry()}>다시 연결</button> : null}</div>
    <section className={`shared-lyric-document ${writable ? "is-writable" : "is-readonly"}`}><div ref={editorParent} className="shared-lyric-editor" /></section>
    <footer><div><strong>공개된 필드</strong><span>제목 · 본문{lyric.status ? " · 상태" : ""}{lyric.ownerDisplayName ? " · 공유자" : ""}{lyric.updatedAt ? " · 수정 시각" : ""}</span>
      <small>작업 메모, 연결 자료, 버전 기록, 계정·자료 목록은 포함되지 않습니다. {new Date(lyric.expiresAt).toLocaleString("ko-KR")}에 링크 만료</small></div>
      <button type="button" onClick={() => void copy.copyText(body, "공유 가사", "공유 가사를 복사했습니다")}>가사 복사</button></footer>
    {recovery}
    {writable ? <aside className="shared-viewers" aria-labelledby="public-viewers-title"><h2 id="public-viewers-title">현재 작성 중인 게스트</h2>{visibleParticipants.length ? <ul>{visibleParticipants.map((item) => <li key={item.participantId} className={`activity-${item.activity}`}><span aria-hidden="true" data-presence-color={item.color} />{item.displayName}<small>{participantDetail(item)}</small></li>)}</ul> : <p>연결된 게스트를 확인하는 중입니다.</p>}</aside> : null}
    <CopyFeedback state={copy} />
  </article>;
}

function parseStoredGuestSession(raw: string | null): (PublicGuestSessionAccess & { linkId: string }) | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (typeof value.id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.id)
      || typeof value.linkId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.linkId)
      || typeof value.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.token)
      || typeof value.recoveryId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.recoveryId)
      || !Number.isSafeInteger(value.permissionEpoch) || !Number.isSafeInteger(value.writeEpoch)
      || typeof value.displayName !== "string" || typeof value.expiresAt !== "string"
      || !Number.isFinite(new Date(value.expiresAt).getTime())) return undefined;
    return value as unknown as PublicGuestSessionAccess & { linkId: string };
  } catch { return undefined; }
}

function participantDetail(item: SharingParticipant): string {
  if (!item.selection) return "게스트 공동 작성 · 연결됨";
  const position = item.selection.from === item.selection.to
    ? `${item.selection.head + 1}번째 글자` : `${item.selection.from + 1}–${item.selection.to + 1}번째 구간`;
  return `게스트 공동 작성 · ${item.activity === "active" ? "작업 중" : "자리 비움"} · ${position}`;
}
