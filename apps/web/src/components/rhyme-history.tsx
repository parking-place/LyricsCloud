"use client";

import { REVISION_REASON_LABELS, type LyricRevision, type RestoreRevisionInput, type RevisionHistory } from "@lyricscloud/domain";
import { compareRevisionLines, type RevisionDiffLine } from "@lyricscloud/editor";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  readHistory(): Promise<RevisionHistory>;
  readRevision(id: string): Promise<LyricRevision>;
  restore(id: string, input: RestoreRevisionInput): Promise<void>;
  onClose(): void;
}

export function RhymeHistory(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const restoreRequest = useRef<RestoreRevisionInput | null>(null);
  const [history, setHistory] = useState<RevisionHistory | null>(null);
  const [selected, setSelected] = useState<LyricRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [mobilePane, setMobilePane] = useState<"both" | "current" | "selected">("both");
  const diff = useMemo(() => selected && history ? compareRevisionLines(history.current.body, selected.body) : null, [history, selected]);

  useEffect(() => {
    dialog.current?.showModal();
    void reload();
    return () => { sequence.current++; };
  }, []);

  async function reload() {
    const current = ++sequence.current;
    setLoading(true); setError(""); setSelected(null); setConfirm(false); restoreRequest.current = null;
    try {
      const value = await props.readHistory();
      if (current === sequence.current) setHistory(value);
    } catch {
      if (current === sequence.current) setError("수정 기록을 불러오지 못했습니다. 연결과 저장 상태를 확인해 주세요.");
    } finally { if (current === sequence.current) setLoading(false); }
  }

  async function select(id: string) {
    const current = ++sequence.current;
    setLoading(true); setError(""); setNotice(""); setConfirm(false); restoreRequest.current = null;
    try {
      const value = await props.readRevision(id);
      if (current === sequence.current) setSelected(value);
    } catch {
      if (current === sequence.current) setError("선택한 기록을 불러오지 못했습니다. 보존 기간이 지났다면 목록을 새로 불러와 주세요.");
    } finally { if (current === sequence.current) setLoading(false); }
  }

  async function restore() {
    if (!selected || !history || restoring) return;
    restoreRequest.current ??= { requestId: crypto.randomUUID(), expectedHash: history.current.hash };
    setRestoring(true); setError("");
    try {
      await props.restore(selected.id, restoreRequest.current);
      setNotice("본문을 복원했습니다. 복원 직전 내용은 새 수정 기록에 보존되어 있습니다.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "REVISION_CURRENT_CHANGED"
        ? "비교 후 현재 본문이 바뀌었습니다. 최신 본문을 다시 확인해 주세요."
        : "복원 결과를 확인하지 못했습니다. 같은 요청을 다시 시도하거나 최신 본문을 불러와 주세요.");
    } finally { setRestoring(false); }
  }

  return <dialog className="lyric-history-dialog rhyme-history-dialog" ref={dialog} aria-labelledby="rhyme-history-title"
    onCancel={(event) => { event.preventDefault(); if (!restoring) props.onClose(); }}>
    <header><div><h2 id="rhyme-history-title">라임 수정 기록</h2><p>본문만 비교·복원하며 제목과 태그, 표시 설정은 유지됩니다.</p></div>
      <button type="button" disabled={restoring} onClick={props.onClose}>닫기</button></header>
    <div className="history-toolbar"><p>변경된 본문은 5분 간격과 중요 작업 전에 기록되며 최대 180일·200개를 보관합니다.</p>
      <button type="button" disabled={restoring || loading} onClick={() => void reload()}>최신 본문·목록 불러오기</button></div>
    {error ? <p className="history-feedback" role="alert">{error} <button type="button" onClick={() => void reload()}>다시 불러오기</button></p> : null}
    {notice ? <p className="history-feedback" role="status">{notice}</p> : null}
    {loading ? <p role="status">본문과 기록을 불러오는 중…</p> : null}
    <div className="history-layout">
      <nav className="history-list" aria-label="라임 수정 기록 목록">
        {history && !loading ? history.items.length ? history.items.map((item) => <button type="button" disabled={restoring} key={item.id}
          aria-pressed={selected?.id === item.id} onClick={() => void select(item.id)}>
          <strong>{REVISION_REASON_LABELS[item.reason]}</strong><time dateTime={item.createdAt}>{date(item.createdAt)}</time>
          <span>{item.preview || "빈 본문"}</span><small>{item.characters.toLocaleString()}자</small>
        </button>) : <p>아직 수정 기록이 없습니다. 본문을 수정하면 자동 기록이 시작됩니다.</p> : null}
      </nav>
      <section className="history-comparison" aria-label="라임 본문 비교">
        {selected && diff ? <>
          <div className="history-mobile-toggle" role="group" aria-label="모바일 비교 표시">
            {([ ["both", "위아래 비교"], ["current", "현재본"], ["selected", "선택 기록"] ] as const).map(([value, label]) =>
              <button type="button" key={value} aria-pressed={mobilePane === value} onClick={() => setMobilePane(value)}>{label}</button>)}
          </div>
          <p>{diff.identical ? "두 본문이 같습니다." : "− 현재본에만 있는 줄 · + 기록에만 있는 줄"}</p>
          <div className={`revision-diff panes-${mobilePane}`}>
            <DiffPane title="현재본" lines={diff.left} className="diff-current" />
            <DiffPane title={date(selected.createdAt)} lines={diff.right} className="diff-selected" />
          </div>
          <div className="history-restore">{confirm ? <>
            <p>현재 본문을 새 기록에 보존하고 선택한 내용으로 복원합니다. 다른 기기에도 반영됩니다.</p>
            <button type="button" disabled={restoring} onClick={() => void restore()}>{restoring ? "현재본 보존·복원 중…" : "현재 본문 보존 후 복원"}</button>
            <button type="button" disabled={restoring} onClick={() => setConfirm(false)}>취소</button>
          </> : <button type="button" disabled={loading || diff.identical} onClick={() => setConfirm(true)}>이 기록으로 복원</button>}</div>
        </> : !loading ? <p>목록에서 기록을 선택하면 현재 본문과 비교할 수 있습니다.</p> : null}
      </section>
    </div>
  </dialog>;
}

function DiffPane({ title, lines, className }: { title: string; lines: RevisionDiffLine[]; className: string }) {
  return <section className={className}><h3>{title}</h3><div className="diff-lines" tabIndex={0} aria-label={`${title} 본문`}>
    {lines.length ? lines.map((line, index) => <div key={index} className={`diff-line diff-${line.kind}`}>
      <span className="diff-number" aria-hidden="true">{line.number ?? ""}</span><span className="diff-sign" aria-hidden="true">{line.kind === "removed" ? "−" : line.kind === "added" ? "+" : " "}</span>
      <span className="diff-text">{(line.text.endsWith("\n") ? line.text.slice(0, -1) : line.text) || <br />}</span>
    </div>) : <p>빈 본문</p>}
  </div></section>;
}

function date(value: string) { return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "medium" }); }
