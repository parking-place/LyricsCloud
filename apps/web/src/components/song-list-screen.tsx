"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { LibraryViewModeSelector, useLibraryViewMode } from "./library-view-mode-selector.js";

const STATUSES = ["idea", "writing_lyrics", "revising", "suno_generating", "mixing", "completed", "on_hold"] as const;
const SORTS = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first", "manual"] as const;
const WORK_FILTERS = ["all", "has_linked_resources", "no_lyrics"] as const;
type SongStatus = (typeof STATUSES)[number];
type SongSort = (typeof SORTS)[number];
type SongWorkFilter = (typeof WORK_FILTERS)[number];
type ResourceColor = "red" | "yellow" | "green" | "blue" | "gray";

export interface SongListQuery {
  readonly search: string;
  readonly status: SongStatus | "";
  readonly work: SongWorkFilter;
  readonly sort: SongSort;
}

interface Song {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: SongStatus;
  readonly color: ResourceColor | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly pinOrder: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lyricCount: number;
}

interface SongListResponse {
  readonly items: Song[];
  readonly totalCount: number;
  readonly nextCursor: string | null;
  readonly orderVersion: number;
  readonly capabilities: { readonly lyricsSearch: true; readonly linkedResourceFilters: true; readonly manualOrder: true };
}

interface SongMoveBody {
  readonly requestId: string;
  readonly itemId: string;
  readonly beforeId: string | null;
  readonly afterId: string | null;
  readonly expectedVersion: number;
}

interface PendingSongMove {
  readonly body: SongMoveBody;
  readonly title: string;
  readonly snapshot: Song[];
  readonly optimistic: Song[];
}

const STATUS_LABELS: Record<SongStatus, string> = {
  idea: "아이디어",
  writing_lyrics: "가사 작성 중",
  revising: "수정 중",
  suno_generating: "Suno 생성 중",
  mixing: "믹싱 중",
  completed: "완성",
  on_hold: "보류"
};
const SORT_LABELS: Record<SongSort, string> = {
  updated_desc: "최근 수정순",
  created_desc: "최근 생성순",
  created_asc: "오래된 생성순",
  title_asc: "제목순",
  favorite_first: "즐겨찾기 우선",
  manual: "사용자 정렬"
};
const WORK_FILTER_LABELS: Record<SongWorkFilter, string> = {
  all: "전체 작업",
  has_linked_resources: "연결 자료 있음",
  no_lyrics: "가사 없음"
};

export function SongListScreen({ initialQuery }: { initialQuery: SongListQuery }) {
  const libraryView = useLibraryViewMode("songs");
  const [search, setSearch] = useState(initialQuery.search);
  const [appliedSearch, setAppliedSearch] = useState(initialQuery.search.trim());
  const [status, setStatus] = useState<SongStatus | "">(initialQuery.status);
  const [work, setWork] = useState<SongWorkFilter>(initialQuery.work);
  const [sort, setSort] = useState<SongSort>(initialQuery.sort);
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [orderVersion, setOrderVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [retryMove, setRetryMove] = useState<PendingSongMove | null>(null);
  const requestSequence = useRef(0);
  const moveInFlight = useRef(false);
  const loadButton = useRef<HTMLButtonElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const restoredScrollKey = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (appliedSearch) params.set("search", appliedSearch);
    if (status) params.set("status", status);
    if (work !== "all") params.set("work", work);
    if (sort !== "updated_desc") params.set("sort", sort);
    window.history.replaceState(null, "", `/songs${params.size ? `?${params}` : ""}`);

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const apiParams = new URLSearchParams({ sort, limit: "12" });
    if (appliedSearch) apiParams.set("search", appliedSearch);
    if (status) apiParams.set("status", status);
    if (work !== "all") apiParams.set("work", work);
    void fetch(`/api/songs?${apiParams}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("목록을 불러오지 못했습니다.");
        return response.json() as Promise<SongListResponse>;
      })
      .then((result) => {
        if (sequence !== requestSequence.current) return;
        setSongs(result.items);
        setTotalCount(result.totalCount);
        setNextCursor(result.nextCursor);
        setOrderVersion(result.orderVersion);
        setRetryMove(null);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setSongs([]);
        setTotalCount(0);
        setNextCursor(null);
        setError(caught instanceof Error ? caught.message : "목록을 불러오지 못했습니다.");
      })
      .finally(() => { if (sequence === requestSequence.current) setLoading(false); });
    return () => controller.abort();
  }, [appliedSearch, status, work, sort, retryKey]);

  async function loadMore(restoreFocus = true) {
    if (!nextCursor || loadingMore) return;
    let loaded = false;
    setLoadingMore(true);
    setError("");
    const params = new URLSearchParams({ sort, limit: "12", cursor: nextCursor });
    if (appliedSearch) params.set("search", appliedSearch);
    if (status) params.set("status", status);
    if (work !== "all") params.set("work", work);
    try {
      const response = await fetch(`/api/songs?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("다음 곡을 불러오지 못했습니다.");
      const result = await response.json() as SongListResponse;
      setSongs((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
      setOrderVersion(result.orderVersion);
      loaded = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "다음 곡을 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
      if (loaded && restoreFocus) window.requestAnimationFrame(() => window.requestAnimationFrame(() => loadButton.current?.focus()));
    }
  }

  async function toggle(song: Song, field: "isFavorite" | "isPinned") {
    const value = !song[field];
    setNotice("");
    setSongs((current) => current.map((item) => item.id === song.id ? { ...item, [field]: value } : item));
    const endpoint = field === "isFavorite" ? "favorite" : "pin";
    const body = field === "isPinned" ? { value, pinOrder: value ? 0 : null } : { value };
    try {
      const response = await fetch(`/api/songs/${song.id}/${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { song: Song };
      setSongs((current) => current.map((item) => item.id === song.id ? result.song : item));
      setNotice(`${song.title}의 ${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${value ? "설정" : "해제"}했습니다.`);
    } catch {
      setSongs((current) => current.map((item) => item.id === song.id ? song : item));
      setNotice("변경을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function submitMove(pending: PendingSongMove) {
    if (moveInFlight.current) return;
    moveInFlight.current = true;
    setMovingId(pending.body.itemId);
    setRetryMove(null);
    setNotice("");
    setSongs(pending.optimistic);
    try {
      const response = await fetch("/api/songs/order/moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.body)
      });
      if (response.status === 409) {
        setSongs(pending.snapshot);
        setSort("manual");
        setRetryKey((value) => value + 1);
        setNotice("다른 화면에서 곡 순서가 변경되어 최신 사용자 정렬을 불러왔습니다.");
        return;
      }
      if (!response.ok) throw new Error("SAVE_FAILED");
      const result = await response.json() as { orderVersion: number };
      setOrderVersion(result.orderVersion);
      setSort("manual");
      setNotice(`${pending.title} 순서를 사용자 정렬로 저장했습니다.`);
    } catch {
      setSongs(pending.snapshot);
      setRetryMove(pending);
      setNotice("곡 순서를 저장하지 못했습니다. 원래 순서로 복원했습니다.");
    } finally { moveInFlight.current = false; setMovingId(null); }
  }

  function moveSong(itemId: string, destinationIndex: number) {
    if (moveInFlight.current) return;
    const song = songs.find(({ id }) => id === itemId);
    if (!song) return;
    const group = songs.filter(({ isPinned }) => isPinned === song.isPinned);
    const sourceIndex = group.findIndex(({ id }) => id === itemId);
    if (sourceIndex < 0 || group.length < 2) return;
    const without = group.filter(({ id }) => id !== itemId);
    const boundedIndex = Math.max(0, Math.min(destinationIndex, without.length));
    const nextGroup = [...without.slice(0, boundedIndex), song, ...without.slice(boundedIndex)];
    if (nextGroup.every((item, index) => item.id === group[index]?.id)) return;
    let groupIndex = 0;
    const optimistic = songs.map((item) => item.isPinned === song.isPinned ? nextGroup[groupIndex++]! : item);
    const newIndex = nextGroup.findIndex(({ id }) => id === itemId);
    void submitMove({
      title: song.title,
      snapshot: songs,
      optimistic,
      body: {
        requestId: crypto.randomUUID(),
        itemId,
        beforeId: nextGroup[newIndex + 1]?.id ?? null,
        afterId: nextGroup[newIndex - 1]?.id ?? null,
        expectedVersion: orderVersion
      }
    });
  }

  function moveToTarget(itemId: string, targetId: string, after: boolean) {
    const song = songs.find(({ id }) => id === itemId);
    const target = songs.find(({ id }) => id === targetId);
    if (!song || !target || song.isPinned !== target.isPinned || itemId === targetId) return;
    const without = songs.filter(({ isPinned, id }) => isPinned === song.isPinned && id !== itemId);
    const targetIndex = without.findIndex(({ id }) => id === targetId);
    if (targetIndex >= 0) moveSong(itemId, targetIndex + (after ? 1 : 0));
  }

  const filtered = Boolean(appliedSearch || status || work !== "all");
  const returnParams = new URLSearchParams();
  if (appliedSearch) returnParams.set("search", appliedSearch);
  if (status) returnParams.set("status", status);
  if (work !== "all") returnParams.set("work", work);
  if (sort !== "updated_desc") returnParams.set("sort", sort);
  const returnTo = `/songs${returnParams.size ? `?${returnParams}` : ""}`;
  const newSongHref = `/songs/new?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    if (loading || loadingMore || restoredScrollKey.current === returnTo) return;
    const saved = window.sessionStorage.getItem(scrollStorageKey(returnTo));
    if (saved === null) return;
    const snapshot = parseScrollSnapshot(saved);
    if (snapshot.itemCount > songs.length && nextCursor) {
      void loadMore(false);
      return;
    }
    restoredScrollKey.current = returnTo;
    const { scrollTop } = snapshot;
    if (!Number.isFinite(scrollTop) || scrollTop < 0) return;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      pageRef.current?.scrollTo({ top: scrollTop });
      window.scrollTo({ top: scrollTop });
    }));
  }, [loading, loadingMore, nextCursor, returnTo, songs.length]);

  function rememberScroll() {
    const page = pageRef.current;
    const scrollTop = page && page.scrollHeight > page.clientHeight + 1 ? page.scrollTop : window.scrollY;
    window.sessionStorage.setItem(scrollStorageKey(returnTo), JSON.stringify({ scrollTop, itemCount: songs.length }));
  }

  return <section ref={pageRef} className="songs-page" aria-labelledby="songs-title">
    <header className="songs-heading">
      <div><p className="eyebrow">Song library</p><h1 id="songs-title" tabIndex={-1} data-login-focus>내 곡</h1><p>아이디어부터 완성까지, 지금 흐름을 한눈에 관리하세요.</p></div>
      <a className="primary-link new-song-link" href={newSongHref}>＋ 새 곡</a>
    </header>

    <div className="song-toolbar">
      <label className="search-field"><span className="sr-only">곡 검색</span><span aria-hidden="true">⌕</span><input value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="곡 제목·메모 또는 가사 검색" type="search" /></label>
      <label className="select-field"><span>상태</span><select aria-label="곡 상태 필터" value={status} onChange={(event) => setStatus(event.target.value as SongStatus | "")}><option value="">전체 상태</option>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
      <label className="select-field"><span>작업</span><select aria-label="곡 작업 조건 필터" value={work} onChange={(event) => setWork(event.target.value as SongWorkFilter)}>{WORK_FILTERS.map((value) => <option key={value} value={value}>{WORK_FILTER_LABELS[value]}</option>)}</select></label>
      <label className="select-field"><span>정렬</span><select aria-label="곡 정렬" value={sort} onChange={(event) => setSort(event.target.value as SongSort)}>{SORTS.map((value) => <option key={value} value={value}>{SORT_LABELS[value]}</option>)}</select></label>
    </div>
    <div className="status-chips" aria-label="곡 상태 빠른 필터"><button className={!status ? "active" : ""} aria-pressed={!status} onClick={() => setStatus("")}>전체</button>{STATUSES.map((value) => <button key={value} className={status === value ? "active" : ""} aria-pressed={status === value} onClick={() => setStatus(value)}>{STATUS_LABELS[value]}</button>)}</div>
    <LibraryViewModeSelector label="곡 목록" state={libraryView} />

    <div className="list-summary" aria-live="polite"><strong>{loading ? "곡을 불러오는 중" : `총 ${totalCount}곡`}</strong>{filtered ? <span>현재 검색 조건</span> : <span>내 개인 작업 공간</span>}</div>
    {notice ? <div className="song-order-notice" role="status"><span>{notice}</span>{retryMove ? <button type="button" disabled={Boolean(movingId)} onClick={() => void submitMove(retryMove)}>같은 이동 다시 시도</button> : null}</div> : null}
    {error ? <div className="list-error" role="alert"><strong>{error}</strong><button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></div> : null}

    {loading ? <div className={`song-grid library-grid library-view-${libraryView.viewMode}`} aria-label="곡 목록 불러오는 중">{Array.from({ length: 6 }, (_, index) => <div className="song-card skeleton" key={index} aria-hidden="true" />)}</div> : null}
    {!loading && !error && songs.length === 0 ? <div className="empty-state song-empty"><span aria-hidden="true">{filtered ? "⌕" : "♪"}</span><h2>{filtered ? "조건에 맞는 곡이 없어요" : "아직 만든 곡이 없어요"}</h2><p>{filtered ? "검색어나 필터를 바꾸면 다른 곡을 찾을 수 있어요." : "떠오른 아이디어를 첫 곡으로 기록해보세요."}</p>{filtered ? <button className="secondary-button" type="button" onClick={() => { setSearch(""); setStatus(""); setWork("all"); }}>검색 조건 지우기</button> : <a className="primary-link" href={newSongHref}>첫 곡 만들기</a>}</div> : null}
    {!loading && songs.length > 0 ? <div className={`song-grid library-grid library-view-${libraryView.viewMode}`} data-view-mode={libraryView.viewMode}>{songs.map((song) => {
      const group = songs.filter(({ isPinned }) => isPinned === song.isPinned);
      const position = group.findIndex(({ id }) => id === song.id);
      return <SongCard song={song} returnTo={returnTo} key={song.id} onOpen={rememberScroll} onToggle={toggle}
        moving={movingId === song.id} dragActive={draggedId !== null} canMoveBefore={position > 0} canMoveAfter={position >= 0 && position < group.length - 1}
        onMove={(destination) => moveSong(song.id, destination === "first" ? 0 : destination === "previous" ? position - 1 : destination === "next" ? position + 1 : group.length - 1)}
        onDragStart={() => setDraggedId(song.id)} onDragEnd={() => setDraggedId(null)}
        onDrop={(event) => { if (!draggedId) return; const box = event.currentTarget.getBoundingClientRect(); moveToTarget(draggedId, song.id, event.clientY >= box.top + box.height / 2); setDraggedId(null); }} />;
    })}</div> : null}
    {!loading && songs.length > 0 ? <div className="load-more-wrap"><button ref={loadButton} className="secondary-button load-more" type="button" disabled={!nextCursor || loadingMore} onClick={() => void loadMore()}>{loadingMore ? "불러오는 중…" : nextCursor ? "더 불러오기" : "모든 곡을 불러왔습니다"}</button></div> : null}
  </section>;
}

function SongCard({ song, returnTo, onOpen, onToggle, moving, dragActive, canMoveBefore, canMoveAfter, onMove, onDragStart, onDragEnd, onDrop }: {
  song: Song; returnTo: string; onOpen: () => void; onToggle: (song: Song, field: "isFavorite" | "isPinned") => void;
  moving: boolean; dragActive: boolean; canMoveBefore: boolean; canMoveAfter: boolean;
  onMove: (destination: "first" | "previous" | "next" | "last") => void;
  onDragStart: () => void; onDragEnd: () => void; onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const note = song.workNotes || song.description;
  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>) {
    const destination = event.key === "Home" ? "first" : event.key === "ArrowUp" || event.key === "ArrowLeft" ? "previous"
      : event.key === "ArrowDown" || event.key === "ArrowRight" ? "next" : event.key === "End" ? "last" : null;
    if (!destination) return;
    event.preventDefault();
    onMove(destination);
  }
  return <article className={`song-card${song.color ? ` color-${song.color}` : ""}${moving ? " is-moving" : ""}${dragActive ? " drag-active" : ""}`}
    onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(event); }}>
    <a className="song-card-hit" href={`/songs/${song.id}?returnTo=${encodeURIComponent(returnTo)}`} aria-label={`${song.title} 대시보드 열기`} onClick={onOpen}><span className="sr-only">{song.title}</span></a>
    <div className="song-card-top"><span className={`status-badge status-${song.status}`}>{STATUS_LABELS[song.status]}</span><span className="song-card-actions"><button type="button" className={song.isPinned ? "is-on" : ""} aria-label={`${song.title} ${song.isPinned ? "고정 해제" : "고정"}`} aria-pressed={song.isPinned} onClick={() => onToggle(song, "isPinned")}>⌁</button><button type="button" className={song.isFavorite ? "is-on" : ""} aria-label={`${song.title} ${song.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} aria-pressed={song.isFavorite} onClick={() => onToggle(song, "isFavorite")}>★</button></span></div>
    <h2>{song.title}</h2>
    <p className={note ? "song-note" : "song-note is-empty"}>{note || "아직 작업 메모가 없습니다."}</p>
    <div className="song-order-controls" aria-label={`${song.title} 순서 이동`}>
      <button type="button" className="song-drag-handle" draggable={!moving} disabled={moving} aria-label={`${song.title} 드래그 또는 방향키로 순서 이동`}
        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", song.id); onDragStart(); }} onDragEnd={onDragEnd} onKeyDown={keyboardMove}>⠿</button>
      <button type="button" disabled={moving || !canMoveBefore} aria-label={`${song.title} 맨 앞으로 이동`} title="맨 앞으로" onClick={() => onMove("first")}>⇤</button>
      <button type="button" disabled={moving || !canMoveBefore} aria-label={`${song.title} 앞으로 이동`} onClick={() => onMove("previous")}>↑</button>
      <button type="button" disabled={moving || !canMoveAfter} aria-label={`${song.title} 뒤로 이동`} onClick={() => onMove("next")}>↓</button>
      <button type="button" disabled={moving || !canMoveAfter} aria-label={`${song.title} 맨 뒤로 이동`} title="맨 뒤로" onClick={() => onMove("last")}>⇥</button>
    </div>
    <footer><span>가사 {song.lyricCount}개</span><time dateTime={song.updatedAt}>{relativeDate(song.updatedAt)}</time></footer>
  </article>;
}

function scrollStorageKey(returnTo: string) {
  return `lyricscloud:song-list-scroll:${returnTo}`;
}

function parseScrollSnapshot(value: string): { scrollTop: number; itemCount: number } {
  try {
    const parsed = JSON.parse(value) as { scrollTop?: unknown; itemCount?: unknown };
    return {
      scrollTop: typeof parsed.scrollTop === "number" ? parsed.scrollTop : 0,
      itemCount: typeof parsed.itemCount === "number" ? parsed.itemCount : 0
    };
  } catch {
    return { scrollTop: Number(value), itemCount: 0 };
  }
}

function relativeDate(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "오늘 수정";
  if (days === 1) return "어제 수정";
  if (days < 7) return `${days}일 전 수정`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
