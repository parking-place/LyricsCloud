"use client";

import { createBrowserSharedLyricSync, type BrowserSharedLyricSync, type SharingParticipant, type SharedLyricSyncState } from "@lyricscloud/editor";
import { LYRIC_STATUS_LABELS, type LyricStatus } from "@lyricscloud/domain";
import { useEffect, useRef, useState } from "react";
import { CopyFeedback, useCopyFeedback } from "./copy-feedback.js";

interface SharedLyric {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly status: LyricStatus;
  readonly updatedAt: string;
  readonly ownerDisplayName: string;
  readonly access: { readonly mode: "read"; readonly permissionEpoch: number };
}

export function SharedLyricViewer({ initialLyric }: { initialLyric: SharedLyric }) {
  const sync = useRef<BrowserSharedLyricSync | null>(null);
  const [body, setBody] = useState(initialLyric.body);
  const [state, setState] = useState<SharedLyricSyncState>("connecting");
  const [participants, setParticipants] = useState<readonly SharingParticipant[]>([]);
  const copy = useCopyFeedback();

  useEffect(() => {
    let active = true;
    void createBrowserSharedLyricSync({ resourceId: initialLyric.id,
      onBody(value) { if (active) setBody(value); },
      onStateChange(value) { if (active) setState(value); },
      onPresenceChange(value) { if (active) setParticipants(value); }
    }).then((value) => { if (active) sync.current = value; else value.destroy(); });
    return () => { active = false; sync.current?.destroy(); sync.current = null; };
  }, [initialLyric.id]);

  if (state === "revoked") return <section className="shared-access-ended" aria-labelledby="shared-ended-title">
    <p className="eyebrow">Sharing ended</p><h1 id="shared-ended-title">이 가사를 더 이상 열 수 없습니다</h1>
    <p>공유가 회수·만료되었거나 자료가 삭제되었을 수 있습니다. 자료의 존재 여부는 별도로 확인하지 않습니다.</p>
    <a className="primary-link" href="/workspace">내 작업 공간으로</a>
  </section>;

  const visibleParticipants = participants.filter((item) => item.role === "owner" || item.role === "read");
  return <article className="shared-lyric-page" aria-labelledby="shared-lyric-title">
    <header className="shared-lyric-header"><div><p className="eyebrow">Shared lyrics</p><h1 id="shared-lyric-title">{initialLyric.title}</h1><p>{initialLyric.ownerDisplayName}님이 공유함 · {LYRIC_STATUS_LABELS[initialLyric.status]}</p></div><div className="shared-read-badge"><span aria-hidden="true">◉</span><strong>읽기 전용</strong><small>수정·삭제·권한 변경 불가</small></div></header>
    <div className={`shared-live-state state-${state}`} role="status" aria-live="polite"><span aria-hidden="true" />{state === "live" ? "실시간으로 연결됨" : state === "offline" ? "오프라인 · 마지막으로 받은 내용을 표시 중" : state === "error" ? "실시간 연결을 확인하지 못했습니다" : "최신 내용을 확인하는 중…"}{state === "error" ? <button type="button" onClick={() => sync.current?.retry()}>다시 연결</button> : null}</div>
    <section className="shared-lyric-document" aria-label="공유된 가사 본문"><pre>{body || "아직 입력된 가사가 없습니다."}</pre></section>
    <footer className="shared-lyric-footer"><div><strong>공유된 필드</strong><span>제목 · 본문 · 상태</span><small>작업 메모, 연결 자료, 버전 기록은 포함되지 않습니다.</small></div><button type="button" onClick={() => void copy.copyText(body, "공유 가사", "공유 가사를 복사했습니다")}>가사 복사</button></footer>
    <aside className="shared-viewers" aria-labelledby="shared-viewers-title"><h2 id="shared-viewers-title">현재 보는 사람</h2>{visibleParticipants.length ? <ul>{visibleParticipants.map((item) => <li key={item.participantId}><span aria-hidden="true" />{item.displayName}<small>{item.role === "owner" ? "소유자" : "읽기 전용"}</small></li>)}</ul> : <p>연결된 참여자를 확인하는 중입니다.</p>}</aside>
    <CopyFeedback state={copy} />
  </article>;
}

export function SharedAccessUnavailable() {
  return <section className="shared-access-ended" aria-labelledby="shared-unavailable-title"><p className="eyebrow">Private sharing</p><h1 id="shared-unavailable-title">공유 가사를 열 수 없습니다</h1><p>이 계정에 읽기 권한이 없거나 공유가 회수·만료·삭제되었습니다. 어떤 경우인지 구분해 자료 존재를 노출하지 않습니다.</p><div><a href="/workspace">내 작업 공간으로</a><a className="primary-link" href="/auth">다른 계정으로 로그인</a></div></section>;
}
