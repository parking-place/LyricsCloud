"use client";

import { REVISION_REASON_LABELS, type LyricRevision, type RestoreRevisionInput, type RevisionHistory } from "@lyricscloud/domain";
import { useEffect, useState } from "react";

interface PromptRevisionValue { readonly title: string; readonly tokens: readonly { readonly displayValue: string }[] }

export function PromptHistory(props: {
  readonly onClose: () => void;
  readonly readHistory: () => Promise<RevisionHistory>;
  readonly readRevision: (id: string) => Promise<LyricRevision>;
  readonly restore: (id: string, input: RestoreRevisionInput) => Promise<void>;
}) {
  const [history, setHistory] = useState<RevisionHistory | null>(null);
  const [selection, setSelection] = useState<{ id: string; value: PromptRevisionValue } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void props.readHistory().then((value) => { if (active) setHistory(value); })
      .catch(() => { if (active) setError("수정 기록을 불러오지 못했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function select(id: string) {
    setLoading(true); setError(""); setNotice("");
    try { const revision = await props.readRevision(id); setSelection({ id, value: parsePromptRevision(revision.body) }); }
    catch { setError("선택한 수정 기록을 읽지 못했습니다."); }
    finally { setLoading(false); }
  }

  async function restore() {
    if (!history || !selection || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await props.restore(selection.id, { requestId: crypto.randomUUID(), expectedHash: history.current.hash });
      const next = await props.readHistory(); setHistory(next); setNotice("제목과 태그를 복원했습니다.");
    } catch { setError("현재 내용이 바뀌었거나 연결할 수 없어 복원하지 못했습니다."); }
    finally { setBusy(false); }
  }

  const current = history ? parsePromptRevision(history.current.body) : null;
  return <div className="dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) props.onClose(); }}>
    <section className="prompt-history-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-history-title">
      <header><div><p className="eyebrow">Revision history</p><h2 id="prompt-history-title">프롬프트 수정 기록</h2></div><button type="button" disabled={busy} onClick={props.onClose}>닫기</button></header>
      <p>5분 간격과 중요 작업 전에 남긴 기록입니다. 중복 정리 전 상태도 복원할 수 있습니다.</p>
      {error ? <p role="alert">{error}</p> : null}{notice ? <p role="status">{notice}</p> : null}{loading ? <p role="status">기록을 불러오는 중…</p> : null}
      <div className="prompt-history-layout">
        <nav aria-label="프롬프트 수정 기록 목록">{history?.items.length ? history.items.map((item) => <button type="button" key={item.id}
          aria-pressed={selection?.id === item.id} disabled={busy} onClick={() => void select(item.id)}>
          <strong>{formatDate(item.createdAt)}</strong><span>{item.reason === "large_paste" ? "붙여넣기·중복 정리 전" : REVISION_REASON_LABELS[item.reason]}</span>
        </button>) : !loading ? <p>아직 수정 기록이 없습니다.</p> : null}</nav>
        <div className="prompt-history-compare">
          <RevisionPane title="현재" value={current} />
          <RevisionPane title="선택한 기록" value={selection?.value ?? null} />
        </div>
      </div>
      <footer><button type="button" disabled={!selection || busy} onClick={() => void restore()}>{busy ? "복원 중…" : "현재 내용 보존 후 복원"}</button></footer>
    </section>
  </div>;
}

function RevisionPane({ title, value }: { title: string; value: PromptRevisionValue | null }) {
  return <section><h3>{title}</h3>{value ? <><strong>{value.title || "제목 없음"}</strong><p>{value.tokens.map(({ displayValue }) => displayValue).join(", ") || "태그 없음"}</p></> : <p>기록을 선택해 주세요.</p>}</section>;
}

function parsePromptRevision(value: string): PromptRevisionValue {
  const parsed = JSON.parse(value) as { version?: unknown; title?: unknown; tokens?: unknown };
  if (parsed.version !== 1 || typeof parsed.title !== "string" || !Array.isArray(parsed.tokens)) throw new Error("PROMPT_REVISION_INVALID");
  const tokens = parsed.tokens.map((item) => {
    if (!item || typeof item !== "object" || typeof (item as { displayValue?: unknown }).displayValue !== "string") throw new Error("PROMPT_REVISION_INVALID");
    return { displayValue: (item as { displayValue: string }).displayValue };
  });
  return { title: parsed.title, tokens };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
