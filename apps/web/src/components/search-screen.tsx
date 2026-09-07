"use client";

import {
  findSearchLiteralRange, SEARCH_RESOURCE_TYPES, type RecentSearchRecord,
  type SearchResourceType, type SearchTypeFilter, type UnifiedSearchPage, type UnifiedSearchResult
} from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { Fragment, type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import { buildSearchResultHref, buildSearchUrl } from "../lib/search-navigation.js";

const TYPES: readonly SearchTypeFilter[] = ["all", ...SEARCH_RESOURCE_TYPES];
const TYPE_LABELS: Record<SearchTypeFilter, string> = { all: "전체", song: "곡", lyrics: "가사", rhyme_note: "라임 노트", prompt: "프롬프트" };
const TYPE_ICONS: Record<SearchResourceType, string> = { song: "♪", lyrics: "≡", rhyme_note: "≈", prompt: "◇" };

export function SearchScreen({ ownerId, initialQuery, initialType }: { ownerId: string; initialQuery: string; initialType: SearchTypeFilter }) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery.trim());
  const [type, setType] = useState(initialType);
  const [items, setItems] = useState<readonly UnifiedSearchResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery.trim()));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<readonly RecentSearchRecord[]>([]);
  const [recentLoading, setRecentLoading] = useState(!initialQuery.trim());
  const [recentError, setRecentError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestSequence = useRef(0);
  const resultLinks = useRef<Array<HTMLAnchorElement | null>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const restoredScrollKey = useRef("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const target = buildSearchUrl(query, type);
    const current = `${window.location.pathname}${window.location.search}`;
    if (target !== current) router.replace(target, { scroll: false });
  }, [query, router, type]);

  useEffect(() => {
    if (!query) {
      setItems([]); setNextCursor(null); setLoading(false); setError("");
      return;
    }
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    setLoading(true); setError(""); setItems([]); setNextCursor(null);
    const params = new URLSearchParams({ q: query, type, limit: "20" });
    void fetch(`/api/search?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<UnifiedSearchPage>; })
      .then((page) => {
        if (sequence !== requestSequence.current) return;
        setItems(page.items); setNextCursor(page.nextCursor);
        void fetch("/api/search/recent", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, type }), signal: AbortSignal.timeout(8_000)
        }).catch(() => undefined);
      })
      .catch(() => { if (!controller.signal.aborted && sequence === requestSequence.current) setError("검색 결과를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요."); })
      .finally(() => { if (!controller.signal.aborted && sequence === requestSequence.current) setLoading(false); });
    return () => controller.abort();
  }, [query, retryKey, type]);

  useEffect(() => {
    if (query) return;
    const controller = new AbortController();
    setRecentLoading(true); setRecentError("");
    void fetch("/api/search/recent", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ items: readonly RecentSearchRecord[] }>; })
      .then(({ items: recentItems }) => setRecent(recentItems))
      .catch(() => { if (!controller.signal.aborted) setRecentError("최근 검색어를 불러오지 못했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setRecentLoading(false); });
    return () => controller.abort();
  }, [query, retryKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError("");
    const params = new URLSearchParams({ q: query, type, limit: "20", cursor: nextCursor });
    try {
      const response = await fetch(`/api/search?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const page = await response.json() as UnifiedSearchPage;
      setItems((current) => [...current, ...page.items]); setNextCursor(page.nextCursor);
    } catch { setError("다음 검색 결과를 불러오지 못했습니다. 현재 결과는 그대로 유지합니다."); }
    finally { setLoadingMore(false); }
  }

  function selectType(value: SearchTypeFilter) {
    setType(value); requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.isDefaultPrevented() || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowDown" && items.length) { event.preventDefault(); resultLinks.current[0]?.focus(); }
    else if (event.key === "Escape" && input) { event.preventDefault(); setInput(""); setQuery(""); }
  }

  function onResultKeyDown(event: ReactKeyboardEvent<HTMLAnchorElement>, index: number) {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowDown") { event.preventDefault(); resultLinks.current[Math.min(index + 1, items.length - 1)]?.focus(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); if (index === 0) inputRef.current?.focus(); else resultLinks.current[index - 1]?.focus(); }
    else if (event.key === "Escape") { event.preventDefault(); inputRef.current?.focus(); }
  }

  async function removeRecent(id: string) {
    const previous = recent; setRecent((current) => current.filter((item) => item.id !== id));
    const response = await fetch(`/api/search/recent/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) { setRecent(previous); setRecentError("최근 검색어를 지우지 못했습니다."); }
  }

  async function clearRecent() {
    const previous = recent; setRecent([]);
    const response = await fetch("/api/search/recent", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) { setRecent(previous); setRecentError("최근 검색어를 모두 지우지 못했습니다."); }
  }

  const grouped = SEARCH_RESOURCE_TYPES.map((resourceType) => ({ type: resourceType, items: items.filter((item) => item.type === resourceType) }))
    .filter((group) => group.items.length);

  const scrollKey = `lc:${ownerId}:search-scroll:${buildSearchUrl(query, type)}`;
  useEffect(() => {
    if (!query || loading || restoredScrollKey.current === scrollKey) return;
    restoredScrollKey.current = scrollKey;
    const saved = Number.parseInt(window.sessionStorage.getItem(scrollKey) ?? "0", 10);
    if (Number.isFinite(saved) && saved > 0) requestAnimationFrame(() => {
      pageRef.current?.scrollTo({ top: saved });
      window.scrollTo({ top: saved });
    });
  }, [loading, query, scrollKey]);

  function rememberScrollPosition() {
    window.sessionStorage.setItem(scrollKey, String(Math.max(pageRef.current?.scrollTop ?? 0, window.scrollY)));
  }

  return <section ref={pageRef} className="search-page" aria-labelledby="search-title">
    <header className="search-heading"><p className="eyebrow">Unified search · Private</p><h1 id="search-title" tabIndex={-1} data-login-focus>통합 검색</h1><p>내 곡, 가사, 라임 노트와 프롬프트를 한 번에 찾으세요.</p></header>
    <div className="search-controls">
      <label className="unified-search-input"><span aria-hidden="true">⌕</span><span className="sr-only">통합 검색어</span>
        <input ref={inputRef} autoFocus type="search" aria-label="통합 검색어" maxLength={200} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onInputKeyDown} placeholder="제목, 가사, 라임 또는 프롬프트 검색" />
        {input ? <button type="button" aria-label="검색어 지우기" onClick={() => { setInput(""); setQuery(""); inputRef.current?.focus(); }}>×</button> : <kbd>/</kbd>}
      </label>
      <div className="search-type-chips" role="group" aria-label="자료 유형 필터">
        {TYPES.map((value) => <button key={value} type="button" aria-pressed={type === value} className={type === value ? "active" : ""} onClick={() => selectType(value)}>{TYPE_LABELS[value]}</button>)}
      </div>
    </div>

    {!query ? <SearchStart recent={recent} loading={recentLoading} error={recentError} onRun={(item) => { setInput(item.query); setType(item.type); }} onRemove={removeRecent} onClear={clearRecent} onRetry={() => setRetryKey((value) => value + 1)} /> : null}
    {query ? <div className="search-results" aria-busy={loading}>
      <div className="search-summary" aria-live="polite"><strong>{loading ? "검색하는 중…" : `${items.length}개 결과${nextCursor ? " 이상" : ""}`}</strong><span>‘{query}’ · {TYPE_LABELS[type]}</span></div>
      {error ? <div className="search-error" role="alert"><p>{error}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></div> : null}
      {loading ? <div className="search-loading" aria-label="검색 결과 불러오는 중">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div> : null}
      {!loading && !error && !items.length ? <div className="search-empty"><span aria-hidden="true">⌕</span><h2>검색 결과가 없습니다</h2><p>철자나 표현을 바꾸거나 다른 자료 유형을 선택해 보세요.</p></div> : null}
      {!loading ? grouped.map((group) => <section className="search-result-group" key={group.type} aria-labelledby={`search-group-${group.type}`}>
        <h2 id={`search-group-${group.type}`}><span aria-hidden="true">{TYPE_ICONS[group.type]}</span>{TYPE_LABELS[group.type]} <small>{group.items.length}</small></h2>
        <div className="search-result-list">{group.items.map((item) => {
          const index = items.indexOf(item);
          return <a key={item.id} ref={(element) => { resultLinks.current[index] = element; }} onClick={rememberScrollPosition} onKeyDown={(event) => onResultKeyDown(event, index)} className="search-result-card" href={buildSearchResultHref(item, query, type)}>
            <div><span className={`search-kind kind-${item.type}`}>{TYPE_ICONS[item.type]} {TYPE_LABELS[item.type]}</span><time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time></div>
            <h3><HighlightedText text={item.title} query={query} /></h3>
            <p><HighlightedText text={item.preview} query={query} /></p>
            <footer><span>{item.matchField === "title" ? "제목 일치" : item.matchField === "tag" ? "태그 일치" : "본문 일치"}{item.linkedSongIds.length ? ` · 연결 곡 ${item.linkedSongIds.length}개` : ""}</span><strong>열기 →</strong></footer>
          </a>;
        })}</div>
      </section>) : null}
      {!loading && nextCursor ? <button className="search-more" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "더 불러오는 중…" : "검색 결과 더 보기"}</button> : null}
    </div> : null}
  </section>;
}

function SearchStart({ recent, loading, error, onRun, onRemove, onClear, onRetry }: {
  recent: readonly RecentSearchRecord[]; loading: boolean; error: string;
  onRun: (item: RecentSearchRecord) => void; onRemove: (id: string) => void; onClear: () => void; onRetry: () => void;
}) {
  return <div className="search-start">
    <section className="search-guidance"><span aria-hidden="true">⌕</span><h2>창작 자료를 다시 찾기 쉽게</h2><p>제목·본문·태그의 정확한 문자열을 내 활성 자료 안에서만 검색합니다.</p><ul><li>곡과 가사 제목</li><li>가사·라임 노트 본문</li><li>라임 태그·프롬프트 토큰</li></ul></section>
    <section className="recent-searches" aria-labelledby="recent-search-title"><header><h2 id="recent-search-title">최근 검색어</h2>{recent.length ? <button type="button" onClick={onClear}>전체 지우기</button> : null}</header>
      {loading ? <p aria-live="polite">최근 검색어를 불러오는 중…</p> : null}
      {error ? <p role="alert">{error} <button type="button" onClick={onRetry}>다시 시도</button></p> : null}
      {!loading && !error && !recent.length ? <p>이 계정에서 실행한 최근 검색어가 아직 없습니다.</p> : null}
      <ul>{recent.map((item) => <li key={item.id}><button className="recent-run" type="button" onClick={() => onRun(item)}><span>⌕</span><strong>{item.query}</strong><small>{TYPE_LABELS[item.type]} · {formatDate(item.searchedAt)}</small></button><button className="recent-remove" type="button" aria-label={`최근 검색어 ${item.query} 지우기`} onClick={() => onRemove(item.id)}>×</button></li>)}</ul>
    </section>
  </div>;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const range = findSearchLiteralRange(text, query);
  if (!range) return <>{text}</>;
  return <Fragment>{text.slice(0, range.from)}<mark>{text.slice(range.from, range.to)}</mark>{text.slice(range.to)}</Fragment>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
