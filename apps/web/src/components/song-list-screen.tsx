"use client";

import { useEffect, useRef, useState } from "react";

const STATUSES = ["idea", "writing_lyrics", "revising", "suno_generating", "mixing", "completed", "on_hold"] as const;
const SORTS = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"] as const;
type SongStatus = (typeof STATUSES)[number];
type SongSort = (typeof SORTS)[number];
type ResourceColor = "red" | "yellow" | "green" | "blue" | "gray";

export interface SongListQuery {
  readonly search: string;
  readonly status: SongStatus | "";
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
  readonly capabilities: { readonly lyricsSearch: true; readonly linkedResourceFilters: false };
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
  favorite_first: "즐겨찾기 우선"
};

export function SongListScreen({ initialQuery }: { initialQuery: SongListQuery }) {
  const [search, setSearch] = useState(initialQuery.search);
  const [appliedSearch, setAppliedSearch] = useState(initialQuery.search.trim());
  const [status, setStatus] = useState<SongStatus | "">(initialQuery.status);
  const [sort, setSort] = useState<SongSort>(initialQuery.sort);
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestSequence = useRef(0);
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
    if (sort !== "updated_desc") params.set("sort", sort);
    window.history.replaceState(null, "", `/songs${params.size ? `?${params}` : ""}`);

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const apiParams = new URLSearchParams({ sort, limit: "12" });
    if (appliedSearch) apiParams.set("search", appliedSearch);
    if (status) apiParams.set("status", status);
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
  }, [appliedSearch, status, sort, retryKey]);

  async function loadMore(restoreFocus = true) {
    if (!nextCursor || loadingMore) return;
    let loaded = false;
    setLoadingMore(true);
    setError("");
    const params = new URLSearchParams({ sort, limit: "12", cursor: nextCursor });
    if (appliedSearch) params.set("search", appliedSearch);
    if (status) params.set("status", status);
    try {
      const response = await fetch(`/api/songs?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("다음 곡을 불러오지 못했습니다.");
      const result = await response.json() as SongListResponse;
      setSongs((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
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

  const filtered = Boolean(appliedSearch || status);
  const returnParams = new URLSearchParams();
  if (appliedSearch) returnParams.set("search", appliedSearch);
  if (status) returnParams.set("status", status);
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
      <div><p className="eyebrow">Private beta · 0.6.0</p><h1 id="songs-title" tabIndex={-1} data-login-focus>내 곡</h1><p>아이디어부터 완성까지, 지금 흐름을 한눈에 관리하세요.</p></div>
      <a className="primary-link new-song-link" href={newSongHref}>＋ 새 곡</a>
    </header>

    <div className="song-toolbar">
      <label className="search-field"><span className="sr-only">곡 검색</span><span aria-hidden="true">⌕</span><input value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="곡 제목·메모 또는 가사 검색" type="search" /></label>
      <label className="select-field"><span>상태</span><select aria-label="곡 상태 필터" value={status} onChange={(event) => setStatus(event.target.value as SongStatus | "")}><option value="">전체 상태</option>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
      <label className="select-field"><span>정렬</span><select aria-label="곡 정렬" value={sort} onChange={(event) => setSort(event.target.value as SongSort)}>{SORTS.map((value) => <option key={value} value={value}>{SORT_LABELS[value]}</option>)}</select></label>
    </div>
    <div className="status-chips" aria-label="곡 상태 빠른 필터"><button className={!status ? "active" : ""} aria-pressed={!status} onClick={() => setStatus("")}>전체</button>{STATUSES.map((value) => <button key={value} className={status === value ? "active" : ""} aria-pressed={status === value} onClick={() => setStatus(value)}>{STATUS_LABELS[value]}</button>)}</div>

    <div className="list-summary" aria-live="polite"><strong>{loading ? "곡을 불러오는 중" : `총 ${totalCount}곡`}</strong>{filtered ? <span>현재 검색 조건</span> : <span>내 개인 작업 공간</span>}</div>
    {notice ? <p className="sr-only" role="status">{notice}</p> : null}
    {error ? <div className="list-error" role="alert"><strong>{error}</strong><button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></div> : null}

    {loading ? <div className="song-grid" aria-label="곡 목록 불러오는 중">{Array.from({ length: 6 }, (_, index) => <div className="song-card skeleton" key={index} aria-hidden="true" />)}</div> : null}
    {!loading && !error && songs.length === 0 ? <div className="empty-state song-empty"><span aria-hidden="true">{filtered ? "⌕" : "♪"}</span><h2>{filtered ? "조건에 맞는 곡이 없어요" : "아직 만든 곡이 없어요"}</h2><p>{filtered ? "검색어나 상태 필터를 바꾸면 다른 곡을 찾을 수 있어요." : "떠오른 아이디어를 첫 곡으로 기록해보세요."}</p>{filtered ? <button className="secondary-button" type="button" onClick={() => { setSearch(""); setStatus(""); }}>검색 조건 지우기</button> : <a className="primary-link" href={newSongHref}>첫 곡 만들기</a>}</div> : null}
    {!loading && songs.length > 0 ? <div className="song-grid">{songs.map((song) => <SongCard song={song} returnTo={returnTo} key={song.id} onOpen={rememberScroll} onToggle={toggle} />)}</div> : null}
    {!loading && songs.length > 0 ? <div className="load-more-wrap"><button ref={loadButton} className="secondary-button load-more" type="button" disabled={!nextCursor || loadingMore} onClick={() => void loadMore()}>{loadingMore ? "불러오는 중…" : nextCursor ? "더 불러오기" : "모든 곡을 불러왔습니다"}</button></div> : null}
  </section>;
}

function SongCard({ song, returnTo, onOpen, onToggle }: { song: Song; returnTo: string; onOpen: () => void; onToggle: (song: Song, field: "isFavorite" | "isPinned") => void }) {
  const note = song.workNotes || song.description;
  return <article className={`song-card${song.color ? ` color-${song.color}` : ""}`}>
    <a className="song-card-hit" href={`/songs/${song.id}?returnTo=${encodeURIComponent(returnTo)}`} aria-label={`${song.title} 대시보드 열기`} onClick={onOpen}><span className="sr-only">{song.title}</span></a>
    <div className="song-card-top"><span className={`status-badge status-${song.status}`}>{STATUS_LABELS[song.status]}</span><span className="song-card-actions"><button type="button" className={song.isPinned ? "is-on" : ""} aria-label={`${song.title} ${song.isPinned ? "고정 해제" : "고정"}`} aria-pressed={song.isPinned} onClick={() => onToggle(song, "isPinned")}>⌁</button><button type="button" className={song.isFavorite ? "is-on" : ""} aria-label={`${song.title} ${song.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} aria-pressed={song.isFavorite} onClick={() => onToggle(song, "isFavorite")}>★</button></span></div>
    <h2>{song.title}</h2>
    <p className={note ? "song-note" : "song-note is-empty"}>{note || "아직 작업 메모가 없습니다."}</p>
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
