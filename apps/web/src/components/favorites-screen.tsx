"use client";

import { LYRIC_STATUS_LABELS, SONG_STATUS_LABELS, type SavedResourceItem, type SavedResourceQuery, type SavedResourceMutation } from "@lyricscloud/domain";
import { useRef, useState } from "react";

const TYPE_LABELS = { song: "곡", lyrics: "가사", rhyme_note: "라임 노트", prompt: "프롬프트" } as const;
const TYPE_FILTERS = [["all", "전체"], ["song", "곡"], ["lyrics", "가사"], ["rhyme_note", "라임"], ["prompt", "프롬프트"]] as const;
const STATUS_FILTERS = [
  ["all", "모든 상태"], ["idea", SONG_STATUS_LABELS.idea], ["writing_lyrics", SONG_STATUS_LABELS.writing_lyrics],
  ["revising", SONG_STATUS_LABELS.revising], ["suno_generating", SONG_STATUS_LABELS.suno_generating],
  ["mixing", SONG_STATUS_LABELS.mixing], ["completed", SONG_STATUS_LABELS.completed], ["on_hold", SONG_STATUS_LABELS.on_hold],
  ["draft", LYRIC_STATUS_LABELS.draft], ["final", LYRIC_STATUS_LABELS.final]
] as const;

export function FavoritesScreen({ initialItems, songs, query }: { initialItems: readonly SavedResourceItem[] | null; songs: readonly { id: string; title: string }[]; query: SavedResourceQuery }) {
  const [items, setItems] = useState(initialItems);
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const queues = useRef(new Map<string, Promise<void>>()); const dragId = useRef<string | null>(null);
  const orderQueue = useRef(Promise.resolve());
  const pinned = items?.filter((item) => item.isPinned) ?? [];
  const favorites = items?.filter((item) => item.isFavorite && !item.isPinned) ?? [];

  function toggle(item: SavedResourceItem, field: "isFavorite" | "isPinned") {
    if (!items) return;
    const next = !item[field]; setError("");
    setItems((current) => current?.map((value) => value.id === item.id ? { ...value, [field]: next, ...(field === "isPinned" ? { pinOrder: next ? pinned.length : null } : {}) } : value)
      .filter((value) => keepForScope(value, query.scope)) ?? null);
    const previous = queues.current.get(item.id) ?? Promise.resolve();
    const task = previous.then(async () => {
      const endpoint = field === "isFavorite" ? "favorite" : "pin";
      const response = await fetch(`/api/saved/${item.id}/${endpoint}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: next }) });
      if (!response.ok) throw new Error("SAVE_FAILED");
      const result = await response.json() as { resource: SavedResourceMutation };
      setItems((current) => current?.map((value) => value.id === item.id ? { ...value, ...result.resource } : value) ?? null);
      setNotice(`${item.title} ${field === "isFavorite" ? "즐겨찾기" : "핀"}을 ${next ? "설정" : "해제"}했습니다.`);
    }).catch(() => { setError("변경을 저장하지 못했습니다. 최신 상태를 다시 불러와 주세요."); });
    queues.current.set(item.id, task);
  }

  function move(id: string, delta: number) {
    const currentPinned = (items ?? []).filter((item) => item.isPinned).sort(pinSort);
    const from = currentPinned.findIndex((item) => item.id === id); const to = from + delta;
    if (from < 0 || to < 0 || to >= currentPinned.length) { setNotice(to < 0 ? "이미 첫 번째 핀입니다." : "이미 마지막 핀입니다."); return; }
    const ordered = [...currentPinned]; [ordered[from], ordered[to]] = [ordered[to]!, ordered[from]!];
    saveOrder(ordered);
  }

  function drop(targetId: string) {
    const sourceId = dragId.current; dragId.current = null; if (!sourceId || sourceId === targetId) return;
    const ordered = (items ?? []).filter((item) => item.isPinned).sort(pinSort);
    const from = ordered.findIndex((item) => item.id === sourceId); const to = ordered.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return; const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved!); saveOrder(ordered);
  }

  function saveOrder(ordered: SavedResourceItem[]) {
    const ids = ordered.map(({ id }) => id);
    setItems((current) => current?.map((item) => item.isPinned ? { ...item, pinOrder: ids.indexOf(item.id) } : item).sort(savedSort) ?? null);
    setError("");
    orderQueue.current = orderQueue.current.then(async () => {
      const response = await fetch("/api/saved/pins/order", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!response.ok) throw new Error("ORDER_FAILED"); setNotice("핀 순서를 저장했습니다.");
    }).catch(() => setError("핀 순서를 저장하지 못했습니다. 최신 상태를 다시 불러와 주세요."));
  }

  const queryString = (changes: Partial<Record<"type" | "scope" | "song" | "status", string>>) => {
    const params = new URLSearchParams();
    const values = { type: query.type, scope: query.scope, song: query.songId ?? "", status: query.status, ...changes };
    if (values.type !== "all") params.set("type", values.type); if (values.scope !== "all") params.set("scope", values.scope);
    if (values.song) params.set("song", values.song); if (values.status !== "all") params.set("status", values.status);
    const text = params.toString(); return text ? `/favorites?${text}` : "/favorites";
  };

  return <section className="favorites-page" aria-labelledby="favorites-title">
    <header className="favorites-heading"><div><p className="eyebrow">Pinned & Favorites</p><h1 id="favorites-title">즐겨찾기</h1><p>지금 집중하는 핀과 오래 다시 쓸 즐겨찾기를 한곳에서 엽니다.</p></div><a className="secondary-button" href="/search">통합 검색</a></header>
    <nav className="saved-scopes" aria-label="표시 범위">{([["all", "모두"], ["pinned", "핀"], ["favorites", "즐겨찾기"]] as const).map(([scope, label]) => <a key={scope} href={queryString({ scope })} aria-current={query.scope === scope ? "page" : undefined} className={query.scope === scope ? "active" : ""}>{label}</a>)}</nav>
    <div className="saved-filters"><nav aria-label="자료 유형">{TYPE_FILTERS.map(([type, label]) => <a key={type} href={queryString({ type })} aria-current={query.type === type ? "page" : undefined} className={query.type === type ? "active" : ""}>{label}</a>)}</nav>
      <label>소속 곡<select value={query.songId ?? ""} onChange={(event) => location.assign(queryString({ song: event.target.value }))}><option value="">모든 곡</option>{songs.map((song) => <option key={song.id} value={song.id}>{song.title}</option>)}</select></label>
      <label>작업 상태<select value={query.status} onChange={(event) => location.assign(queryString({ status: event.target.value }))}>{STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>{error ? <p className="saved-error" role="alert">{error} <a href={queryString({})}>다시 불러오기</a></p> : null}
    {items === null ? <div className="recent-empty" role="alert"><span>!</span><h2>즐겨찾기를 불러오지 못했습니다.</h2><a className="primary-link" href={queryString({})}>다시 시도</a></div>
      : items.length === 0 ? <div className="recent-empty"><span>★</span><h2>표시할 자료가 없습니다.</h2><p>자주 쓰는 자료의 즐겨찾기 또는 핀 버튼을 눌러 이곳에 모아 보세요.</p><a className="primary-link" href="/songs">자료 둘러보기</a></div>
        : <><section className="pinned-section" aria-labelledby="pinned-title"><header><h2 id="pinned-title">◆ 지금 집중 중</h2><span>핀 {pinned.length}개 · 순서 변경</span></header>
          {pinned.length ? <div className="pinned-grid">{pinned.sort(pinSort).map((item, index) => <SavedCard key={item.id} item={item} pinned index={index} count={pinned.length} onToggle={toggle} onMove={move} onDrag={(id) => { dragId.current = id; }} onDrop={drop} />)}</div> : <p className="saved-inline-empty">현재 고정한 자료가 없습니다.</p>}</section>
          <section className="favorite-section" aria-labelledby="favorite-title"><header><h2 id="favorite-title">★ 즐겨찾기</h2><span>최근 사용순</span></header>
          {favorites.length ? <div className="favorite-list">{favorites.map((item) => <SavedCard key={item.id} item={item} onToggle={toggle} onMove={move} onDrag={() => undefined} onDrop={() => undefined} />)}</div> : <p className="saved-inline-empty">핀과 분리해 표시할 즐겨찾기가 없습니다.</p>}</section></>}
  </section>;
}

function SavedCard({ item, pinned = false, index = 0, count = 0, onToggle, onMove, onDrag, onDrop }: { item: SavedResourceItem; pinned?: boolean; index?: number; count?: number; onToggle: (item: SavedResourceItem, field: "isFavorite" | "isPinned") => void; onMove: (id: string, delta: number) => void; onDrag: (id: string) => void; onDrop: (id: string) => void }) {
  const href = resourceHref(item); const status = statusLabel(item);
  return <article className={`saved-card saved-${item.type}`} draggable={pinned} onDragStart={() => onDrag(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(item.id)} onKeyDown={(event) => { if (!pinned) return; if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); onMove(item.id, -1); } if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); onMove(item.id, 1); } }} tabIndex={pinned ? 0 : undefined}>
    <div className="saved-card-top"><span className="recent-type">{TYPE_LABELS[item.type]}</span><div><button type="button" aria-label={`${item.title} ${item.isPinned ? "핀 해제" : "핀 설정"}`} aria-pressed={item.isPinned} onClick={() => onToggle(item, "isPinned")}>⌁ <span>{item.isPinned ? "핀 해제" : "핀"}</span></button><button type="button" aria-label={`${item.title} ${item.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 설정"}`} aria-pressed={item.isFavorite} onClick={() => onToggle(item, "isFavorite")}>★ <span>{item.isFavorite ? "해제" : "즐겨찾기"}</span></button></div></div>
    <h3><a href={href}>{item.title}</a></h3><p>{item.parentSong ? `소속 곡 · ${item.parentSong.title}${item.linkedSongCount > 1 ? ` 외 ${item.linkedSongCount - 1}곡` : ""}` : item.type === "song" ? "독립 곡 자료" : "연결 곡 없음"}{status ? ` · ${status}` : ""}{item.hasWorkNote ? " · 작업 메모 있음" : ""}</p>
    <footer><time dateTime={item.lastOpenedAt ?? item.updatedAt}>{formatTime(item.lastOpenedAt ?? item.updatedAt)}</time><a href={href}>열기 →</a>{pinned ? <span className="pin-moves"><button type="button" disabled={index === 0} aria-label={`${item.title} 앞으로 이동`} onClick={() => onMove(item.id, -1)}>← 앞으로</button><button type="button" disabled={index === count - 1} aria-label={`${item.title} 뒤로 이동`} onClick={() => onMove(item.id, 1)}>뒤로 →</button></span> : null}</footer>
  </article>;
}
function resourceHref(item: SavedResourceItem) { const back = encodeURIComponent("/favorites"); return item.type === "song" ? `/songs/${item.id}?returnTo=${back}` : item.type === "lyrics" ? `/lyrics/${item.id}?returnTo=${back}` : item.type === "rhyme_note" ? `/rhymes/${item.id}?returnTo=${back}` : `/prompts/${item.id}?returnTo=${back}`; }
function statusLabel(item: SavedResourceItem) { if (!item.status) return ""; return item.type === "song" ? SONG_STATUS_LABELS[item.status as keyof typeof SONG_STATUS_LABELS] : item.type === "lyrics" ? LYRIC_STATUS_LABELS[item.status as keyof typeof LYRIC_STATUS_LABELS] : ""; }
function formatTime(value: string) { return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function pinSort(a: SavedResourceItem, b: SavedResourceItem) { return (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id); }
function savedSort(a: SavedResourceItem, b: SavedResourceItem) { return Number(b.isPinned) - Number(a.isPinned) || pinSort(a, b); }
function keepForScope(item: SavedResourceItem, scope: SavedResourceQuery["scope"]) { return scope === "pinned" ? item.isPinned : scope === "favorites" ? item.isFavorite : item.isPinned || item.isFavorite; }
