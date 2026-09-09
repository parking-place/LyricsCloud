"use client";

import { REVISION_REASON_LABELS, type LyricRecord, type LyricRevision, type RestoreRevisionInput, type RevisionHistory } from "@lyricscloud/domain";
import { compareRevisionLines, type RevisionDiffLine } from "@lyricscloud/editor";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  lyricId: string;
  versions: readonly LyricRecord[];
  readHistory(): Promise<RevisionHistory>;
  readRevision(id: string): Promise<LyricRevision>;
  restore(id: string, input: RestoreRevisionInput): Promise<void>;
  onClose(): void;
}
interface Selection { kind: "revision" | "version"; id: string; title: string; body: string }

export function LyricHistory(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requestSequence = useRef(0);
  const restoreRequest = useRef<RestoreRevisionInput | null>(null);
  const [history, setHistory] = useState<RevisionHistory | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tab, setTab] = useState<"revision" | "version">("revision");
  const [mobilePane, setMobilePane] = useState<"both" | "current" | "selected">("both");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const versions = props.versions.filter((version) => version.id !== props.lyricId);
  const diff = useMemo(() => selection && history ? compareRevisionLines(history.current.body, selection.body) : null, [selection, history]);

  useEffect(() => {
    dialog.current?.showModal();
    void reload();
    return () => { requestSequence.current++; };
  }, []);

  async function reload() {
    const sequence = ++requestSequence.current;
    setLoading(true); setError(""); setSelection(null); setConfirm(false); restoreRequest.current = null;
    try {
      const value = await props.readHistory();
      if (sequence === requestSequence.current) setHistory(value);
    } catch { if (sequence === requestSequence.current) setError("기록을 불러오지 못했습니다. 연결과 저장 상태를 확인한 뒤 다시 시도해 주세요."); }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }

  async function select(kind: Selection["kind"], id: string) {
    const sequence = ++requestSequence.current;
    setLoading(true); setError(""); setNotice(""); setSelection(null); setConfirm(false); restoreRequest.current = null;
    try {
      let value: Selection;
      if (kind === "revision") {
        const revision = await props.readRevision(id);
        value = { kind, id, body: revision.body, title: `${date(revision.createdAt)} · ${REVISION_REASON_LABELS[revision.reason]}` };
      } else {
        const response = await fetch(`/api/lyrics/${id}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error();
        const { lyric } = await response.json() as { lyric: LyricRecord };
        value = { kind, id, title: lyric.title, body: lyric.body };
      }
      if (sequence === requestSequence.current) setSelection(value);
    } catch { if (sequence === requestSequence.current) setError("선택한 본문을 불러오지 못했습니다. 삭제되었거나 보존 기간이 지난 경우 목록을 새로 불러와 주세요."); }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }

  async function restore() {
    if (!selection || !history || restoring) return;
    restoreRequest.current ??= { requestId: crypto.randomUUID(), expectedHash: history.current.hash };
    setRestoring(true); setError("");
    try {
      await props.restore(selection.id, restoreRequest.current);
      setNotice("본문을 복원했습니다. 복원 직전 내용은 새 수정 기록에 보존되어 있습니다.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "REVISION_CURRENT_CHANGED"
        ? "비교 후 현재 본문이 바뀌었습니다. 최신 본문을 다시 불러와 확인한 뒤 복원해 주세요."
        : "복원 결과를 확인하지 못했습니다. 같은 복원 요청을 다시 시도하거나 최신 본문을 불러와 확인해 주세요.");
    } finally { setRestoring(false); }
  }

  return <dialog className="lyric-history-dialog" ref={dialog} aria-labelledby="lyric-history-title"
    onCancel={(event) => { event.preventDefault(); if (!restoring) props.onClose(); }}>
    <header><div><h2 id="lyric-history-title">수정 기록 · 버전 비교</h2><p>본문만 비교·복원합니다. 제목과 작업 메모는 유지됩니다.</p></div>
      <button type="button" disabled={restoring} onClick={props.onClose}>닫기</button></header>
    <div className="history-toolbar">
      <div role="group" aria-label="비교 자료 종류">
        <button type="button" disabled={restoring || loading} aria-pressed={tab === "revision"} onClick={() => { setTab("revision"); setSelection(null); setConfirm(false); }}>수정 기록</button>
        <button type="button" disabled={restoring || loading} aria-pressed={tab === "version"} onClick={() => { setTab("version"); setSelection(null); setConfirm(false); }}>다른 가사 버전</button>
      </div>
      <button type="button" disabled={restoring || loading} onClick={() => void reload()}>최신 본문·목록 불러오기</button>
    </div>
    <p className="history-policy">{tab === "revision" ? "변경된 본문은 5분 간격과 중요 작업 전에 기록됩니다. 기록은 최대 180일·200개까지 보관됩니다." : "이름 있는 가사는 독립 문서입니다. 수정 기록 보존 기간의 영향을 받지 않습니다."}</p>
    {error ? <p className="history-feedback" role="alert">{error} <button type="button" disabled={restoring || loading} onClick={() => void reload()}>다시 불러오기</button></p> : null}
    {notice ? <p className="history-feedback" role="status">{notice}</p> : null}
    {loading ? <p role="status">본문과 기록을 불러오는 중…</p> : null}
    <div className="history-layout">
      <nav className="history-list" aria-label={tab === "revision" ? "수정 기록 목록" : "비교할 다른 가사"}>
        {tab === "revision" && history ? history.items.length ? history.items.map((item) =>
          <button type="button" disabled={restoring} key={item.id} aria-pressed={selection?.id === item.id} onClick={() => void select("revision", item.id)}>
            <strong>{REVISION_REASON_LABELS[item.reason]}</strong><time dateTime={item.createdAt}>{date(item.createdAt)}</time>
            <span>{item.preview || "빈 본문"}</span><small>{item.characters.toLocaleString()}자</small>
          </button>) : <p>아직 수정 기록이 없습니다. 본문을 수정하면 자동 기록이 시작됩니다.</p> : null}
        {tab === "version" ? versions.length ? versions.map((version) =>
          <button type="button" disabled={restoring} key={version.id} aria-pressed={selection?.id === version.id} onClick={() => void select("version", version.id)}><strong>{version.title}</strong><small>독립 가사 버전</small></button>)
          : <p>비교할 다른 가사가 없습니다. 편집기의 복제로 독립 버전을 만들 수 있습니다.</p> : null}
      </nav>
      <section className="history-comparison" aria-label="본문 비교">
        {selection && diff ? <>
          <div className="history-mobile-toggle" role="group" aria-label="모바일 비교 표시">
            {([ ["both", "위아래 비교"], ["current", "현재본"], ["selected", "선택한 본문"] ] as const).map(([value, label]) =>
              <button type="button" key={value} aria-pressed={mobilePane === value} onClick={() => setMobilePane(value)}>{label}</button>)}
          </div>
          <p>{diff.identical ? "두 본문이 같습니다." : "− 현재본에만 있는 줄 · + 선택한 본문에만 있는 줄"}</p>
          {diff.simplified ? <p>변경이 많아 본문 전체를 표시합니다.</p> : null}
          <div className={`revision-diff panes-${mobilePane}`}>
            <DiffPane title="현재본" lines={diff.left} className="diff-current" />
            <DiffPane title={selection.title} lines={diff.right} className="diff-selected" />
          </div>
          {selection.kind === "revision" ? <div className="history-restore">
            {confirm ? <>
              <p>현재 본문을 새 기록에 먼저 보존하고 선택한 내용으로 복원합니다. 같은 계정의 다른 기기에도 반영됩니다.</p>
              <button type="button" disabled={restoring} onClick={() => void restore()}>{restoring ? "현재본 보존·복원 중…" : "현재 본문 보존 후 복원"}</button>
              <button type="button" disabled={restoring} onClick={() => setConfirm(false)}>취소</button>
            </> : <button type="button" disabled={loading || diff.identical} onClick={() => setConfirm(true)}>이 기록으로 복원</button>}
          </div> : <p>필요한 문장을 선택해 복사할 수 있습니다. 다른 가사 버전은 그대로 유지됩니다.</p>}
        </> : !loading ? <p>목록에서 기록이나 다른 가사를 선택하면 현재 본문과 비교할 수 있습니다.</p> : null}
      </section>
    </div>
  </dialog>;
}

function DiffPane({ title, lines, className }: { title: string; lines: RevisionDiffLine[]; className: string }) {
  let lastLine: RevisionDiffLine | undefined;
  for (const line of lines) if (line.kind !== "gap") lastLine = line;
  return <section className={className}><h3>{title}</h3><div className="diff-lines" tabIndex={0} aria-label={`${title} 본문`}>
    {lines.length ? lines.map((line, index) => <div key={index} className={`diff-line diff-${line.kind}`}>
      <span className="diff-number" aria-hidden="true">{line.number ?? ""}</span><span className="diff-sign" aria-hidden="true">{line.kind === "removed" ? "−" : line.kind === "added" ? "+" : " "}</span>
      <span className="diff-text">{(line.text.endsWith("\n") ? line.text.slice(0, -1) : line.text) || <br />}</span>
    </div>) : <p>빈 본문</p>}
  </div>{lastLine ? <p className="diff-ending">{lastLine.text.endsWith("\n") ? "끝줄 줄바꿈 있음" : "끝줄 줄바꿈 없음"}</p> : null}</section>;
}
function date(value: string) { return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "medium" }); }
