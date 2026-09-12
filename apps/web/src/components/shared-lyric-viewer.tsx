"use client";

import { createBrowserSharedLyricSync, createCodeMirrorTextEditor, type BrowserSharedLyricSync,
  type CodeMirrorTextEditor, type RejectedWriterDraft, type SharingParticipant,
  type SharedLyricAccess, type SharedLyricSyncState } from "@lyricscloud/editor";
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
  readonly access: { readonly mode: "read" | "write"; readonly grantId: string;
    readonly permissionEpoch: number; readonly writeEpoch: number };
}

export function SharedLyricViewer({ actorId, initialLyric }: { actorId: string; initialLyric: SharedLyric }) {
  const sync = useRef<BrowserSharedLyricSync | null>(null);
  const editor = useRef<CodeMirrorTextEditor | null>(null);
  const editorParent = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef(initialLyric.body);
  const [body, setBody] = useState(initialLyric.body);
  const [state, setState] = useState<SharedLyricSyncState>("connecting");
  const [access, setAccess] = useState<SharedLyricAccess>(initialLyric.access);
  const [participants, setParticipants] = useState<readonly SharingParticipant[]>([]);
  const [rejectedDrafts, setRejectedDrafts] = useState<readonly RejectedWriterDraft[]>([]);
  const copy = useCopyFeedback();

  function downloadDraft(draft: RejectedWriterDraft) {
    const url = URL.createObjectURL(new Blob([draft.authoredText], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `lyricscloud-recovery-${draft.rejectedAt.slice(0, 10)}.txt`; anchor.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    let active = true;
    const parent = editorParent.current;
    if (!parent) return;
    const textEditor = createCodeMirrorTextEditor({ parent, initialValue: initialLyric.body,
      ariaLabel: "공유된 가사 본문", readOnly: true,
      onChange(value) { bodyRef.current = value; if (active) setBody(value); },
      onCompositionStart() { sync.current?.setComposing(true); },
      onCompositionEnd() { sync.current?.setComposing(false); },
      onSelectionChange(selection) { sync.current?.updateSelection(selection); },
      onTransaction(transaction) { sync.current?.applyLocalTransaction(transaction); }
    });
    editor.current = textEditor;
    void createBrowserSharedLyricSync({ actorId, resourceId: initialLyric.id, initialAccess: initialLyric.access,
      onBody(value, changes) {
        if (!active || value === bodyRef.current) return;
        const currentLength = editor.current?.value.length ?? 0;
        bodyRef.current = value; setBody(value);
        editor.current?.applyTransaction({ changes: changes ?? [{ from: 0, to: currentLength, insert: value }] });
      },
      onStateChange(value) { if (active) setState(value); },
      onAccessChange(value) { if (active) { setAccess(value); textEditor.setEditable(value.mode === "write"); } },
      onPresenceChange(value) { if (active) setParticipants(value); },
      onRejectedDrafts(value) { if (active) setRejectedDrafts(value); }
    }).then((value) => { if (active) sync.current = value; else value.destroy(); });
    return () => {
      active = false;
      textEditor.finishComposition();
      textEditor.destroy(); editor.current = null;
      void sync.current?.destroy(); sync.current = null;
    };
  }, [actorId, initialLyric.access, initialLyric.body, initialLyric.id]);

  const recovery = rejectedDrafts.length ? <section className="shared-writer-recovery" aria-labelledby="shared-recovery-title">
    <div><p className="eyebrow">LOCAL RECOVERY</p><h2 id="shared-recovery-title">전송되지 않은 내 작성 내용</h2></div>
    <p>쓰기 권한 경계에서 서버에 반영되지 않은 이 기기의 입력만 보관했습니다. 원문을 복사해 별도로 보관한 뒤 항목을 제거할 수 있습니다.</p>
    <ul>{rejectedDrafts.map((draft) => <li key={draft.updateId}><pre>{draft.authoredText || "(전송되지 않은 삭제 동작)"}</pre><div>{draft.authoredText ? <><button type="button" onClick={() => void copy.copyText(draft.authoredText, "미전송 작성 내용", "미전송 작성 내용을 복사했습니다")}>내용 복사</button><button type="button" onClick={() => downloadDraft(draft)}>텍스트 파일 저장</button></> : null}<button type="button" className="danger-text" onClick={() => void sync.current?.removeRejectedDraft(draft.updateId)}>보관함에서 제거</button></div></li>)}</ul>
  </section> : null;

  if (state === "revoked") return <section className="shared-access-ended" aria-labelledby="shared-ended-title">
    <p className="eyebrow">Sharing ended</p><h1 id="shared-ended-title">이 가사를 더 이상 열 수 없습니다</h1>
    <p>공유가 회수·만료되었거나 자료가 삭제되었을 수 있습니다. 자료의 존재 여부는 별도로 확인하지 않습니다.</p>
    {recovery}
    <a className="primary-link" href="/workspace">내 작업 공간으로</a>
    <CopyFeedback state={copy} />
  </section>;

  const visibleParticipants = participants.filter((item) => item.role === "owner" || item.role === "read" || item.role === "write");
  return <article className="shared-lyric-page" aria-labelledby="shared-lyric-title">
    <header className="shared-lyric-header"><div><p className="eyebrow">Shared lyrics</p><h1 id="shared-lyric-title">{initialLyric.title}</h1><p>{initialLyric.ownerDisplayName}님이 공유함 · {LYRIC_STATUS_LABELS[initialLyric.status]}</p></div><div className={`shared-read-badge access-${access.mode}`}><span aria-hidden="true">◉</span><strong>{access.mode === "write" ? "공동 작성" : "읽기 전용"}</strong><small>{access.mode === "write" ? "본문 작성 가능 · 권한 관리는 소유자만" : "수정·삭제·권한 변경 불가"}</small></div></header>
    <div className={`shared-live-state state-${state}`} role="status" aria-live="polite"><span aria-hidden="true" />{state === "live" ? (access.mode === "write" ? "실시간으로 연결됨 · 모든 변경 저장됨" : "실시간으로 연결됨") : state === "saving-local" ? "이 기기에 입력을 저장하는 중…" : state === "syncing" ? "서버에 변경을 저장하는 중…" : state === "offline" ? (access.mode === "write" ? "오프라인 · 입력은 이 기기에 보관됩니다" : "오프라인 · 마지막으로 받은 내용을 표시 중") : state === "error" ? "실시간 연결을 확인하지 못했습니다" : "최신 내용과 권한을 확인하는 중…"}{state === "error" ? <button type="button" onClick={() => sync.current?.retry()}>다시 연결</button> : null}</div>
    <section className={`shared-lyric-document ${access.mode === "write" ? "is-writable" : "is-readonly"}`}><div ref={editorParent} className="shared-lyric-editor" /></section>
    <footer className="shared-lyric-footer"><div><strong>공유된 필드</strong><span>제목 · 본문 · 상태</span><small>작업 메모, 연결 자료, 버전 기록은 포함되지 않습니다.</small></div><button type="button" onClick={() => void copy.copyText(body, "공유 가사", "공유 가사를 복사했습니다")}>가사 복사</button></footer>
    {recovery}
    <aside className="shared-viewers" aria-labelledby="shared-viewers-title"><h2 id="shared-viewers-title">현재 보는 사람</h2>{visibleParticipants.length ? <ul>{visibleParticipants.map((item) => <li key={item.participantId} className={`activity-${item.activity}`}><span aria-hidden="true" data-presence-color={item.color} />{item.displayName}<small>{participantDetail(item)}</small></li>)}</ul> : <p>연결된 참여자를 확인하는 중입니다.</p>}</aside>
    <CopyFeedback state={copy} />
  </article>;
}

function participantDetail(item: SharingParticipant): string {
  const role = item.role === "owner" ? "소유자" : item.role === "write" ? "공동 작성" : "읽기 전용";
  if (!item.selection) return `${role} · 연결됨`;
  const position = item.selection.from === item.selection.to
    ? `${item.selection.head + 1}번째 글자` : `${item.selection.from + 1}–${item.selection.to + 1}번째 구간`;
  return `${role} · ${item.activity === "active" ? "작업 중" : "자리 비움"} · ${position}`;
}

export function SharedAccessUnavailable() {
  return <section className="shared-access-ended" aria-labelledby="shared-unavailable-title"><p className="eyebrow">Private sharing</p><h1 id="shared-unavailable-title">공유 가사를 열 수 없습니다</h1><p>이 계정에 읽기 권한이 없거나 공유가 회수·만료·삭제되었습니다. 어떤 경우인지 구분해 자료 존재를 노출하지 않습니다.</p><div><a href="/workspace">내 작업 공간으로</a><a className="primary-link" href="/auth">다른 계정으로 로그인</a></div></section>;
}
