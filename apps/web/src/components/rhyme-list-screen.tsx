"use client";

import { useEffect, useRef, useState } from "react";

const SORTS = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"] as const;
const COLORS = [null, "red", "yellow", "green", "blue", "gray"] as const;
type RhymeSort = (typeof SORTS)[number];
type ResourceColor = Exclude<(typeof COLORS)[number], null>;

export interface RhymeListQuery { readonly search: string; readonly tag: string; readonly song: string; readonly sort: RhymeSort }
interface Tag { readonly id: string; readonly displayValue: string; readonly normalizedValue: string; readonly createdAt: string; readonly updatedAt: string }
interface LinkedSong { readonly id: string; readonly title: string }
interface RhymeNote {
  readonly id: string; readonly title: string; readonly body: string; readonly isFavorite: boolean; readonly isPinned: boolean;
  readonly pinOrder: number | null; readonly color: ResourceColor | null; readonly rowVersion: number; readonly tags: readonly Tag[];
  readonly linkedSongIds: readonly string[]; readonly linkedSongs: readonly LinkedSong[]; readonly createdAt: string; readonly updatedAt: string;
}
interface RhymeListResponse {
  readonly items: RhymeNote[]; readonly totalCount: number; readonly nextCursor: string | null;
  readonly filters: { readonly tags: readonly { id: string; label: string }[]; readonly songs: readonly LinkedSong[] };
}
interface MetadataQueueEntry<T> {
  desired: T;
  confirmed: T;
  running: boolean;
}

const SORT_LABELS: Record<RhymeSort, string> = {
  updated_desc: "최근 수정순", created_desc: "최근 생성순", created_asc: "오래된 생성순",
  title_asc: "제목순", favorite_first: "즐겨찾기 우선"
};
const COLOR_LABELS: Record<ResourceColor, string> = { red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" };

export function RhymeListScreen({ initialQuery }: { initialQuery: RhymeListQuery }) {
  const [search, setSearch] = useState(initialQuery.search);
  const [appliedSearch, setAppliedSearch] = useState(initialQuery.search.trim());
  const [tag, setTag] = useState(initialQuery.tag);
  const [song, setSong] = useState(initialQuery.song);
  const [sort, setSort] = useState<RhymeSort>(initialQuery.sort);
  const [notes, setNotes] = useState<RhymeNote[]>([]);
  const [filters, setFilters] = useState<RhymeListResponse["filters"]>({ tags: [], songs: [] });
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manualCopy, setManualCopy] = useState<{ title: string; body: string } | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestSequence = useRef(0);
  const metadataQueue = useRef(new Map<string, MetadataQueueEntry<unknown>>());
  const manualText = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = makeParams(appliedSearch, tag, song, sort);
    window.history.replaceState(null, "", `/rhymes${params.size ? `?${params}` : ""}`);
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setLoading(true); setError("");
    const api = makeParams(appliedSearch, tag, song, sort); api.set("limit", "12");
    void fetch(`/api/rhymes?${api}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("라임 노트를 불러오지 못했습니다.");
        return response.json() as Promise<RhymeListResponse>;
      })
      .then((result) => {
        if (sequence !== requestSequence.current) return;
        setNotes(result.items); setTotalCount(result.totalCount); setNextCursor(result.nextCursor); setFilters(result.filters);
        if (tag && !result.filters.tags.some(({ id }) => id === tag)) setTag("");
        if (song && !result.filters.songs.some(({ id }) => id === song)) setSong("");
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setNotes([]); setTotalCount(0); setNextCursor(null);
        setError(caught instanceof Error ? caught.message : "라임 노트를 불러오지 못했습니다.");
      })
      .finally(() => { if (sequence === requestSequence.current) setLoading(false); });
    return () => controller.abort();
  }, [appliedSearch, tag, song, sort, retryKey]);

  useEffect(() => {
    if (manualCopy) window.requestAnimationFrame(() => { manualText.current?.focus(); manualText.current?.select(); });
  }, [manualCopy]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError("");
    const params = makeParams(appliedSearch, tag, song, sort); params.set("limit", "12"); params.set("cursor", nextCursor);
    try {
      const response = await fetch(`/api/rhymes?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("다음 라임 노트를 불러오지 못했습니다.");
      const result = await response.json() as RhymeListResponse;
      setNotes((current) => [...current, ...result.items]); setNextCursor(result.nextCursor); setFilters(result.filters);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "다음 라임 노트를 불러오지 못했습니다."); }
    finally { setLoadingMore(false); }
  }

  function toggle(note: RhymeNote, field: "isFavorite" | "isPinned") {
    const key = `${note.id}:${field}`;
    const pending = metadataQueue.current.get(key) as MetadataQueueEntry<boolean> | undefined;
    const value = !(pending?.desired ?? note[field]);
    const endpoint = field === "isFavorite" ? "favorite" : "pin";
    queueMetadataChange(key, pending?.confirmed ?? note[field], value,
      (next) => patchNote(note.id, field === "isPinned" ? { isPinned: next, pinOrder: next ? 0 : null } : { isFavorite: next }),
      async (next) => fetch(`/api/rhymes/${note.id}/${endpoint}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "isPinned" ? { value: next, pinOrder: next ? 0 : null } : { value: next })
      }),
      (next) => `${note.title}의 ${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${next ? "설정" : "해제"}했습니다.`);
  }

  function cycleColor(note: RhymeNote) {
    const key = `${note.id}:color`;
    const pending = metadataQueue.current.get(key) as MetadataQueueEntry<ResourceColor | null> | undefined;
    const current = pending?.desired ?? note.color;
    const index = COLORS.indexOf(current); const value = COLORS[(index + 1) % COLORS.length] ?? null;
    queueMetadataChange(key, pending?.confirmed ?? note.color, value,
      (next) => patchNote(note.id, { color: next }),
      (next) => fetch(`/api/rhymes/${note.id}/color`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: next }) }),
      (next) => `${note.title}의 색상을 ${next ? COLOR_LABELS[next] : "없음"}으로 변경했습니다.`);
  }

  function queueMetadataChange<T>(key: string, confirmed: T, desired: T, apply: (value: T) => void,
    send: (value: T) => Promise<Response>, successMessage: (value: T) => string) {
    let entry = metadataQueue.current.get(key) as MetadataQueueEntry<T> | undefined;
    if (entry) entry.desired = desired;
    else {
      entry = { confirmed, desired, running: false };
      metadataQueue.current.set(key, entry as MetadataQueueEntry<unknown>);
    }
    apply(desired); setNotice("");
    if (entry.running) return;
    entry.running = true;
    void (async () => {
      while (!Object.is(entry!.confirmed, entry!.desired)) {
        const sent = entry!.desired;
        try {
          const response = await send(sent);
          if (!response.ok) throw new Error();
          entry!.confirmed = sent;
          if (Object.is(entry!.desired, sent)) { apply(sent); setNotice(successMessage(sent)); }
        } catch {
          if (Object.is(entry!.desired, sent)) {
            entry!.desired = entry!.confirmed; apply(entry!.confirmed);
            setNotice("변경을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          }
        }
      }
      entry!.running = false;
      if (metadataQueue.current.get(key) === entry) metadataQueue.current.delete(key);
    })();
  }

  function patchNote(id: string, patch: Partial<RhymeNote>) { setNotes((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); }

  async function copy(note: RhymeNote) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(note.body); setNotice(`${note.title}의 본문 전체를 복사했습니다.`);
    } catch { setManualCopy({ title: note.title, body: note.body }); }
  }

  function clearFilters() { setSearch(""); setAppliedSearch(""); setTag(""); setSong(""); }
  const filtered = Boolean(appliedSearch || tag || song);
  return <section className="rhymes-page" aria-labelledby="rhymes-title">
    <header className="rhymes-heading"><div><p className="eyebrow">Private beta · 0.4.0</p><h1 id="rhymes-title" tabIndex={-1} data-login-focus>라임 노트</h1><p>떠오른 단어와 표현을 모으고, 곡으로 이어가세요.</p></div><a className="primary-link new-rhyme-link" href="/rhymes/new">＋ 새 라임 노트</a></header>
    <div className="rhyme-toolbar">
      <label className="search-field"><span className="sr-only">라임 노트 검색</span><span aria-hidden="true">⌕</span><input value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="제목 또는 본문 검색" type="search" /></label>
      <label className="select-field"><span>연결 곡</span><select aria-label="연결 곡 필터" value={song} onChange={(event) => setSong(event.target.value)}><option value="">모든 곡</option>{filters.songs.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <label className="select-field"><span>정렬</span><select aria-label="라임 노트 정렬" value={sort} onChange={(event) => setSort(event.target.value as RhymeSort)}>{SORTS.map((value) => <option value={value} key={value}>{SORT_LABELS[value]}</option>)}</select></label>
    </div>
    <div className="rhyme-tag-scroll" aria-label="태그 빠른 필터"><button className={!tag ? "active" : ""} aria-pressed={!tag} onClick={() => setTag("")}>전체</button>{filters.tags.map((item) => <button key={item.id} className={tag === item.id ? "active" : ""} aria-pressed={tag === item.id} onClick={() => setTag(item.id)}>#{item.label}</button>)}</div>
    <div className="list-summary" aria-live="polite"><strong>{loading ? "라임 노트를 불러오는 중" : `총 ${totalCount}개`}</strong><span>{filtered ? "현재 검색 조건" : "내 개인 작업 공간"}</span></div>
    {notice ? <p className="copy-toast" role="status">{notice}</p> : null}
    {error ? <div className="list-error" role="alert"><strong>{error}</strong><button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></div> : null}
    {loading ? <div className="rhyme-grid" aria-label="라임 노트 목록 불러오는 중">{Array.from({ length: 6 }, (_, index) => <div className="rhyme-card skeleton" key={index} aria-hidden="true" />)}</div> : null}
    {!loading && !error && notes.length === 0 ? <div className="empty-state rhyme-empty"><span aria-hidden="true">{filtered ? "⌕" : "≈"}</span><h2>{filtered ? "조건에 맞는 라임 노트가 없어요" : "아직 라임 노트가 없어요"}</h2><p>{filtered ? "검색어·태그·연결 곡 조건을 바꿔보세요." : "떠오른 단어나 표현을 짧게라도 남겨보세요."}</p>{filtered ? <button className="secondary-button" type="button" onClick={clearFilters}>검색 조건 지우기</button> : <a className="primary-link" href="/rhymes/new">첫 라임 노트 만들기</a>}</div> : null}
    {!loading && notes.length ? <div className="rhyme-grid">{notes.map((note) => <RhymeCard key={note.id} note={note} onToggle={toggle} onColor={cycleColor} onCopy={copy} />)}</div> : null}
    {!loading && notes.length ? <div className="load-more-wrap"><button className="secondary-button load-more" type="button" disabled={!nextCursor || loadingMore} onClick={() => void loadMore()}>{loadingMore ? "불러오는 중…" : nextCursor ? "더 불러오기" : "모든 라임 노트를 불러왔습니다"}</button></div> : null}
    {manualCopy ? <div className="rhyme-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setManualCopy(null); }}><section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="rhyme-copy-title"><p className="eyebrow">Clipboard fallback</p><h2 id="rhyme-copy-title">{manualCopy.title} 본문을 직접 복사해 주세요</h2><p>브라우저가 클립보드 쓰기를 허용하지 않았습니다. 아래에는 원문 전체가 선택되어 있습니다.</p><textarea ref={manualText} readOnly value={manualCopy.body} /><button type="button" onClick={() => setManualCopy(null)}>닫기</button></section></div> : null}
  </section>;
}

function RhymeCard({ note, onToggle, onColor, onCopy }: { note: RhymeNote; onToggle: (note: RhymeNote, field: "isFavorite" | "isPinned") => void; onColor: (note: RhymeNote) => void; onCopy: (note: RhymeNote) => void }) {
  return <article className={`rhyme-card${note.color ? ` color-${note.color}` : ""}`}>
    <a className="rhyme-card-hit" href={`/rhymes/${note.id}`} aria-label={`${note.title} 라임 노트 열기`}><span className="sr-only">{note.title}</span></a>
    <div className="rhyme-card-top"><button type="button" className={`rhyme-color${note.color ? ` color-${note.color}` : ""}`} aria-label={`${note.title} 색상: ${note.color ? COLOR_LABELS[note.color] : "없음"}. 다음 색상으로 변경`} onClick={() => void onColor(note)}><span aria-hidden="true" /></button><span className="rhyme-card-actions"><button type="button" className={note.isPinned ? "is-on" : ""} aria-label={`${note.title} ${note.isPinned ? "고정 해제" : "고정"}`} aria-pressed={note.isPinned} onClick={() => void onToggle(note, "isPinned")}>⌁</button><button type="button" className={note.isFavorite ? "is-on" : ""} aria-label={`${note.title} ${note.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} aria-pressed={note.isFavorite} onClick={() => void onToggle(note, "isFavorite")}>★</button><button type="button" aria-label={`${note.title} 본문 전체 복사`} onClick={() => void onCopy(note)}>⧉</button></span></div>
    <h2>{note.title}</h2><p className={note.body ? "rhyme-body" : "rhyme-body is-empty"}>{note.body || "아직 본문이 없습니다."}</p>
    {note.tags.length ? <ul className="rhyme-card-tags" aria-label={`${note.title} 태그`}>{note.tags.map((item) => <li key={item.id}>#{item.displayValue}</li>)}</ul> : null}
    <footer><span>{note.linkedSongs.length ? note.linkedSongs.map(({ title }) => title).join(", ") : "연결 곡 없음"}</span><time dateTime={note.updatedAt}>{relativeDate(note.updatedAt)}</time></footer>
  </article>;
}

function makeParams(search: string, tag: string, song: string, sort: RhymeSort): URLSearchParams {
  const params = new URLSearchParams(); if (search) params.set("search", search); if (tag) params.set("tag", tag); if (song) params.set("song", song); if (sort !== "updated_desc") params.set("sort", sort); return params;
}
function relativeDate(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "오늘 수정"; if (days === 1) return "어제 수정"; if (days < 7) return `${days}일 전 수정`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
