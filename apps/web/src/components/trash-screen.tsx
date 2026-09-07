"use client";

import { remainingTrashDays, trashTypes, type LyricRestoreStrategy, type TrashItem, type TrashReference, type TrashTypeFilter } from "@lyricscloud/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { trapDialogTab } from "../lib/dialog-focus.js";
import { StatePanel } from "./state-panel.js";

const TYPE_LABELS: Record<Exclude<TrashTypeFilter, "all">, string> = {
  song: "곡", lyrics: "가사", rhyme_note: "라임 노트", prompt: "프롬프트", template: "템플릿"
};

type Action = "restore" | "permanent";

export function TrashScreen({ initialItems, songs }: { initialItems: readonly TrashItem[]; songs: readonly { id: string; title: string }[] }) {
  const [items, setItems] = useState([...initialItems]);
  const [filter, setFilter] = useState<TrashTypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action | null>(null);
  const [strategy, setStrategy] = useState<LyricRestoreStrategy>("restore_parent");
  const [destinationSongId, setDestinationSongId] = useState(songs[0]?.id ?? "");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const priorFocus = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.type === filter), [filter, items]);
  const targets = items.filter((item) => selected.has(keyOf(item)));
  const orphanLyrics = targets.filter((item) => item.type === "lyrics" && item.parentDeleted);
  const confirmationExpected = targets.length === 1 ? targets[0]!.title : "완전 삭제";

  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => {
    if (!action) return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-trash-dialog] input:not([type=radio]), [data-trash-dialog] button")?.focus());
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); setAction(null); }
      else trapDialogTab(event, "[data-trash-dialog]");
    }
    document.addEventListener("keydown", keyboard);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keyboard); requestAnimationFrame(() => priorFocus.current?.focus()); };
  }, [action]);

  function toggle(item: TrashItem) {
    const key = keyOf(item);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = visible.length > 0 && visible.every((item) => next.has(keyOf(item)));
      for (const item of visible) allSelected ? next.delete(keyOf(item)) : next.add(keyOf(item));
      return next;
    });
  }
  function openAction(next: Action, target?: TrashItem) {
    if (target) setSelected(new Set([keyOf(target)]));
    if (!target && !targets.length) return;
    priorFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAction(next); setConfirmation(""); setMessage("");
  }
  function closeAction() { setAction(null); setConfirmation(""); }

  async function submitAction() {
    if (!action || !targets.length || busy) return;
    if (action === "permanent" && confirmation !== confirmationExpected) return;
    if (action === "restore" && orphanLyrics.length && strategy === "move_to_song" && !destinationSongId) return;
    setBusy(true); setMessage("");
    const references: TrashReference[] = targets.map(({ kind, id }) => ({ kind, id }));
    try {
      const body = action === "restore"
        ? { items: references, confirmedTitles: [], ...(orphanLyrics.length ? { lyricStrategy: strategy } : {}), ...(strategy === "move_to_song" ? { destinationSongId } : {}) }
        : { items: references, confirmedTitles: targets.map(({ kind, id, title }) => ({ kind, id, title })) };
      const response = await fetch(`/api/trash/${action === "restore" ? "restore" : "permanent"}`, {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(String(response.status));
      const refreshed = await fetch(`/api/trash?type=all`, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("REFRESH_FAILED");
      setItems(((await refreshed.json()) as { items: TrashItem[] }).items);
      setSelected(new Set()); setAction(null);
      setMessage(action === "restore" ? "선택한 자료를 원래 위치로 복원했습니다." : "선택한 자료를 완전히 삭제했습니다. 이 작업은 되돌릴 수 없습니다.");
    } catch (error) {
      const status = error instanceof Error ? error.message : "";
      setMessage(status === "409" ? "휴지통 상태가 바뀌었거나 복원 위치를 사용할 수 없습니다. 목록을 새로 확인해 주세요." : "요청을 완료하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  return <section className="trash-page" aria-labelledby="trash-title">
    <header className="trash-heading"><div><p className="eyebrow">Lifecycle · 30 days</p><h1 id="trash-title">휴지통</h1><p>삭제한 자료는 삭제 시각부터 정확히 30일 뒤 자동으로 완전히 삭제됩니다.</p></div><a className="secondary-button" href="/settings#account">계정 수명주기</a></header>
    <div className="trash-toolbar">
      <label>자료 종류<select value={filter} onChange={(event) => { setFilter(event.target.value as TrashTypeFilter); setSelected(new Set()); }}>
        {trashTypes.map((type) => <option key={type} value={type}>{type === "all" ? "전체 자료" : TYPE_LABELS[type]}</option>)}
      </select></label>
      <button type="button" className="secondary-button" onClick={selectVisible} disabled={!visible.length}>{visible.length > 0 && visible.every((item) => selected.has(keyOf(item))) ? "전체 해제" : "보이는 자료 전체 선택"}</button>
      <span>{selected.size ? `${selected.size}개 선택` : `총 ${visible.length}개`}</span>
    </div>
    {message ? <p className={`trash-message${message.includes("못했습니다") || message.includes("바뀌었") ? " warning" : ""}`} role={message.includes("못했습니다") || message.includes("바뀌었") ? "alert" : "status"}>{message}</p> : null}
    {visible.length ? <>
      <div className="trash-table-wrap"><table className="trash-table"><thead><tr><th scope="col">선택</th><th scope="col">자료</th><th scope="col">원래 위치</th><th scope="col">삭제일</th><th scope="col">자동 삭제</th><th scope="col">작업</th></tr></thead><tbody>
        {visible.map((item) => <TrashRow key={keyOf(item)} item={item} checked={selected.has(keyOf(item))} onToggle={() => toggle(item)} onRestore={() => openAction("restore", item)} onDelete={() => openAction("permanent", item)} />)}
      </tbody></table></div>
      <div className="trash-card-list">{visible.map((item) => <TrashCard key={keyOf(item)} item={item} checked={selected.has(keyOf(item))} onToggle={() => toggle(item)} onRestore={() => openAction("restore", item)} onDelete={() => openAction("permanent", item)} />)}</div>
      <div className="trash-bulk-actions"><p>{selected.size ? impactText(targets) : "여러 자료를 선택하면 한 번에, 부분 성공 없이 처리합니다."}</p><button type="button" className="secondary-button" disabled={!selected.size} onClick={() => openAction("restore")}>선택 복원</button><button type="button" className="danger-button" disabled={!selected.size} onClick={() => openAction("permanent")}>선택 완전 삭제</button></div>
    </> : <StatePanel className="empty-state trash-empty" kind="empty" title="휴지통이 비어 있습니다" detail="삭제한 자료가 생기면 원래 위치와 자동 삭제 예정일을 여기에서 확인할 수 있습니다." action={<a className="secondary-button" href="/songs">자료 둘러보기</a>} />}
    {action ? <div className="trash-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) closeAction(); }}>
      <section className="trash-dialog" role="dialog" aria-modal="true" aria-labelledby="trash-dialog-title" data-trash-dialog>
        <header><div><p className="eyebrow">{action === "restore" ? "Restore" : "Permanent delete"}</p><h2 id="trash-dialog-title">{action === "restore" ? `${targets.length}개 자료 복원` : `${targets.length}개 자료 완전 삭제`}</h2></div><button type="button" onClick={closeAction} disabled={busy}>닫기</button></header>
        <ul className="trash-impact-list">{targets.map((item) => <li key={keyOf(item)}><strong>{item.title}</strong><span>{TYPE_LABELS[item.type]} · {item.originalLocation}</span></li>)}</ul>
        <p className="trash-impact-summary">{impactText(targets)}</p>
        {action === "restore" && orphanLyrics.length ? <fieldset className="trash-restore-options"><legend>삭제된 부모 곡에 있던 가사의 복원 위치</legend>
          <label><input type="radio" name="restore-strategy" checked={strategy === "restore_parent"} onChange={() => setStrategy("restore_parent")} /><span><strong>부모 곡과 함께 복원</strong><small>같은 삭제 작업으로 숨겨진 소속 가사도 함께 복원합니다.</small></span></label>
          <label><input type="radio" name="restore-strategy" checked={strategy === "move_to_song"} onChange={() => setStrategy("move_to_song")} /><span><strong>활성 곡으로 이동</strong><small>선택한 가사만 아래 곡으로 옮겨 복원합니다.</small></span></label>
          {strategy === "move_to_song" ? <label>이동할 곡<select value={destinationSongId} onChange={(event) => setDestinationSongId(event.target.value)}><option value="">곡을 선택하세요</option>{songs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label> : null}
        </fieldset> : null}
        {action === "permanent" ? <div className="trash-confirmation"><p>이 자료와 소속 데이터는 즉시 삭제되며 되돌릴 수 없습니다. 인프라 백업에는 운영 보존 기간 동안 암호화된 사본이 남을 수 있고, 일반 사용자 화면에서는 복원할 수 없습니다.</p><label>확인하려면 <strong>{confirmationExpected}</strong>{targets.length === 1 ? " 자료 이름을" : "를"} 입력하세요<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label></div> : null}
        <div className="trash-dialog-actions"><button type="button" className="secondary-button" onClick={closeAction} disabled={busy}>취소</button><button type="button" className={action === "permanent" ? "danger-button" : "primary-link"} onClick={() => void submitAction()} disabled={busy || (action === "permanent" && confirmation !== confirmationExpected) || (action === "restore" && orphanLyrics.length > 0 && strategy === "move_to_song" && !destinationSongId)}>{busy ? "처리 중" : action === "restore" ? "복원" : "완전 삭제"}</button></div>
      </section>
    </div> : null}
  </section>;
}

function TrashRow({ item, checked, onToggle, onRestore, onDelete }: { item: TrashItem; checked: boolean; onToggle: () => void; onRestore: () => void; onDelete: () => void }) {
  return <tr><td><input aria-label={`${item.title} 선택`} type="checkbox" checked={checked} onChange={onToggle} /></td><td><strong>{item.title}</strong><small>{TYPE_LABELS[item.type]}</small></td><td>{item.originalLocation}</td><td>{formatDate(item.deletedAt)}</td><td><strong>{remainingTrashDays(item.purgeAt)}일 남음</strong><small>{formatDate(item.purgeAt)}</small></td><td><div><button type="button" onClick={onRestore}>복원</button><button type="button" className="danger-text-button" onClick={onDelete}>완전 삭제</button></div></td></tr>;
}

function TrashCard({ item, checked, onToggle, onRestore, onDelete }: { item: TrashItem; checked: boolean; onToggle: () => void; onRestore: () => void; onDelete: () => void }) {
  return <article className="trash-card"><header><label><input aria-label={`${item.title} 선택`} type="checkbox" checked={checked} onChange={onToggle} /><span>{TYPE_LABELS[item.type]}</span></label><strong>{remainingTrashDays(item.purgeAt)}일 남음</strong></header><h2>{item.title}</h2><dl><div><dt>원래 위치</dt><dd>{item.originalLocation}</dd></div><div><dt>삭제</dt><dd>{formatDate(item.deletedAt)}</dd></div><div><dt>자동 삭제</dt><dd>{formatDate(item.purgeAt)}</dd></div></dl><p>{impactText([item])}</p><footer><button type="button" className="secondary-button" onClick={onRestore}>복원</button><button type="button" className="danger-button" onClick={onDelete}>완전 삭제</button></footer></article>;
}

function impactText(items: readonly TrashItem[]): string {
  const lyrics = items.reduce((sum, item) => sum + item.affectedLyrics, 0);
  const links = items.reduce((sum, item) => sum + item.preservedLinks, 0);
  const parts = [`선택 자료 ${items.length}개`];
  if (lyrics) parts.push(`같은 삭제 묶음의 소속 가사 ${lyrics}개`);
  if (links) parts.push(`보존되는 연결 ${links}개`);
  return `${parts.join(" · ")}. 모든 변경은 한 트랜잭션으로 처리됩니다.`;
}
function keyOf(item: Pick<TrashItem, "kind" | "id">): string { return `${item.kind}:${item.id}`; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
