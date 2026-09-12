"use client";

import { createBrowserPublicSharedLyricSync, type BrowserPublicSharedLyricSync, type SharedLyricSyncState } from "@lyricscloud/editor";
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
  readonly expiresAt: string;
}

const tokenKey = "lyricscloud:public-share-token:v1";

export function PublicSharedLyricViewer() {
  const sync = useRef<BrowserPublicSharedLyricSync | null>(null);
  const [lyric, setLyric] = useState<PublicLyric | null>(null);
  const [body, setBody] = useState("");
  const [state, setState] = useState<SharedLyricSyncState>("connecting");
  const [unavailable, setUnavailable] = useState(false);
  const copy = useCopyFeedback();

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function consumeCapability() {
      const current = ++generation;
      sync.current?.destroy(); sync.current = null;
      setLyric(null); setBody(""); setUnavailable(false); setState("connecting");
      const fragment = location.hash.startsWith("#") ? location.hash.slice(1) : "";
      if (fragment) sessionStorage.setItem(tokenKey, fragment);
      history.replaceState(history.state, "", `${location.pathname}${location.search}`);
      const token = fragment || sessionStorage.getItem(tokenKey) || "";
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setUnavailable(true); setState("revoked"); return; }
      try {
        const response = await fetch("/api/public/shared-lyric", { method: "POST", cache: "no-store",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        if (!response.ok) throw new Error("PUBLIC_SHARE_UNAVAILABLE");
        const result = await response.json() as { lyric?: PublicLyric };
        if (!result.lyric) throw new Error("PUBLIC_SHARE_UNAVAILABLE");
        if (!active || generation !== current) return;
        setLyric(result.lyric); setBody(result.lyric.body);
        const value = await createBrowserPublicSharedLyricSync({ token, linkId: result.lyric.linkId,
          onBody(nextBody) { if (active && generation === current) setBody(nextBody); },
          onStateChange(nextState) {
            if (!active || generation !== current) return;
            setState(nextState);
            if (nextState === "revoked") { sessionStorage.removeItem(tokenKey); setUnavailable(true); setLyric(null); }
          }
        });
        if (active && generation === current) sync.current = value; else value.destroy();
      } catch {
        if (active && generation === current) {
          sessionStorage.removeItem(tokenKey); setUnavailable(true); setState("revoked");
        }
      }
    }
    const onHashChange = () => { void consumeCapability(); };
    window.addEventListener("hashchange", onHashChange); void consumeCapability();
    return () => { active = false; generation++; window.removeEventListener("hashchange", onHashChange); sync.current?.destroy(); sync.current = null; };
  }, []);

  if (unavailable) return <section className="public-share-card public-share-unavailable" aria-labelledby="public-share-unavailable-title">
    <p className="eyebrow">SHARING ENDED</p><h1 id="public-share-unavailable-title">공유 가사를 열 수 없습니다</h1>
    <p>링크가 만료·회수되었거나 올바르지 않을 수 있습니다. 자료의 존재 여부는 별도로 표시하지 않습니다.</p>
  </section>;

  if (!lyric) return <section className="public-share-card" aria-labelledby="public-share-loading-title">
    <p className="eyebrow">SHARED LYRICS</p><h1 id="public-share-loading-title">공유 가사</h1>
    <p role="status">안전한 공유 링크를 확인하는 중…</p>
  </section>;

  return <article className="public-share-card public-shared-lyric" aria-labelledby="public-shared-title">
    <header><div><p className="eyebrow">PUBLIC READ</p><h1 id="public-shared-title">{lyric.title}</h1>
      <p>{[lyric.ownerDisplayName ? `${lyric.ownerDisplayName}님이 공유함` : null,
        lyric.status ? LYRIC_STATUS_LABELS[lyric.status] : null].filter(Boolean).join(" · ") || "링크로 공유됨"}</p></div>
      <div className="shared-read-badge"><strong>읽기 전용</strong><small>링크 소지자만 열람</small></div></header>
    <div className={`shared-live-state state-${state}`} role="status" aria-live="polite"><span aria-hidden="true" />
      {state === "live" ? "실시간으로 연결됨" : state === "offline" ? "오프라인 · 마지막으로 받은 내용을 표시 중"
        : state === "error" ? "실시간 연결을 확인하지 못했습니다" : "최신 내용을 확인하는 중…"}
      {state === "error" ? <button type="button" onClick={() => sync.current?.retry()}>다시 연결</button> : null}</div>
    <section className="shared-lyric-document" aria-label="공유된 가사 본문"><pre>{body || "아직 입력된 가사가 없습니다."}</pre></section>
    <footer><div><strong>공개된 필드</strong><span>제목 · 본문{lyric.status ? " · 상태" : ""}{lyric.ownerDisplayName ? " · 공유자" : ""}{lyric.updatedAt ? " · 수정 시각" : ""}</span>
      <small>{new Date(lyric.expiresAt).toLocaleString("ko-KR")}에 링크 만료</small></div>
      <button type="button" onClick={() => void copy.copyText(body, "공유 가사", "공유 가사를 복사했습니다")}>가사 복사</button></footer>
    <CopyFeedback state={copy} />
  </article>;
}
