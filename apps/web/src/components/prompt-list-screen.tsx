"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const SORTS = ["favorite_first", "recent_used", "updated_desc", "created_desc", "created_asc", "title_asc"] as const;
type PromptSort = (typeof SORTS)[number];

export interface PromptListQuery {
  readonly search: string;
  readonly song: string;
  readonly favorite: boolean;
  readonly recent: boolean;
  readonly sort: PromptSort;
}

interface PromptToken { readonly displayValue: string; readonly normalizedValue: string }
interface LinkedSong { readonly id: string; readonly title: string }
interface PromptItem {
  readonly id: string; readonly title: string; readonly tokens: readonly PromptToken[]; readonly plainText: string;
  readonly isFavorite: boolean; readonly isPinned: boolean; readonly pinOrder: number | null; readonly rowVersion: number;
  readonly linkedSongs: readonly LinkedSong[]; readonly useCount: number; readonly lastUsedAt: string | null;
  readonly createdAt: string; readonly updatedAt: string;
}
interface PromptListResponse {
  readonly items: PromptItem[]; readonly totalCount: number; readonly nextCursor: string | null;
  readonly filters: { readonly songs: readonly LinkedSong[] };
}
interface MetadataQueueEntry<T> { desired: T; confirmed: T; running: boolean }

const SORT_LABELS: Record<PromptSort, string> = {
  favorite_first: "즐겨찾기 우선", recent_used: "최근 사용순", updated_desc: "최근 수정순",
  created_desc: "최근 생성순", created_asc: "오래된 생성순", title_asc: "제목순"
};

export function PromptListScreen({ initialQuery }: { initialQuery: PromptListQuery }) {
  const [search, setSearch] = useState(initialQuery.search);
  const [appliedSearch, setAppliedSearch] = useState(initialQuery.search.trim());
  const [song, setSong] = useState(initialQuery.song);
  const [favorite, setFavorite] = useState(initialQuery.favorite);
  const [recent, setRecent] = useState(initialQuery.recent);
  const [sort, setSort] = useState<PromptSort>(initialQuery.sort);
  const [items, setItems] = useState<PromptItem[]>([]);
  const [filters, setFilters] = useState<PromptListResponse["filters"]>({ songs: [] });
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manualCopy, setManualCopy] = useState<PromptItem | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const requestSequence = useRef(0);
  const metadataQueue = useRef(new Map<string, MetadataQueueEntry<unknown>>());
  const duplicateRequests = useRef(new Map<string, string>());
  const manualText = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = makeParams(appliedSearch, song, favorite, recent, sort);
    window.history.replaceState(null, "", `/prompts${params.size ? `?${params}` : ""}`);
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setLoading(true); setError("");
    const api = makeParams(appliedSearch, song, favorite, recent, sort); api.set("limit", "12");
    void fetch(`/api/prompts?${api}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("프롬프트를 불러오지 못했습니다.");
        return response.json() as Promise<PromptListResponse>;
      })
      .then((result) => {
        if (sequence !== requestSequence.current) return;
        setItems(result.items); setTotalCount(result.totalCount); setNextCursor(result.nextCursor); setFilters(result.filters);
        if (song && !result.filters.songs.some(({ id }) => id === song)) setSong("");
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        setItems([]); setTotalCount(0); setNextCursor(null);
        setError(caught instanceof Error ? caught.message : "프롬프트를 불러오지 못했습니다.");
      })
      .finally(() => { if (sequence === requestSequence.current) setLoading(false); });
    return () => controller.abort();
  }, [appliedSearch, song, favorite, recent, sort, retryKey]);

  useEffect(() => {
    if (manualCopy) window.requestAnimationFrame(() => { manualText.current?.focus(); manualText.current?.select(); });
  }, [manualCopy]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError("");
    const params = makeParams(appliedSearch, song, favorite, recent, sort); params.set("limit", "12"); params.set("cursor", nextCursor);
    try {
      const response = await fetch(`/api/prompts?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("다음 프롬프트를 불러오지 못했습니다.");
      const result = await response.json() as PromptListResponse;
      setItems((current) => [...current, ...result.items]); setNextCursor(result.nextCursor); setFilters(result.filters);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "다음 프롬프트를 불러오지 못했습니다."); }
    finally { setLoadingMore(false); }
  }

  function toggle(prompt: PromptItem, field: "isFavorite" | "isPinned") {
    const key = `${prompt.id}:${field}`;
    const pending = metadataQueue.current.get(key) as MetadataQueueEntry<boolean> | undefined;
    const value = !(pending?.desired ?? prompt[field]);
    const endpoint = field === "isFavorite" ? "favorite" : "pin";
    queueMetadataChange(key, pending?.confirmed ?? prompt[field], value,
      (next) => patchPrompt(prompt.id, field === "isPinned" ? { isPinned: next, pinOrder: next ? 0 : null } : { isFavorite: next }),
      (next) => fetch(`/api/prompts/${prompt.id}/${endpoint}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(field === "isPinned" ? { value: next, pinOrder: next ? 0 : null } : { value: next })
      }),
      (next) => `${prompt.title}의 ${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${next ? "설정" : "해제"}했습니다.`);
  }

  function queueMetadataChange<T>(key: string, confirmed: T, desired: T, apply: (value: T) => void,
    send: (value: T) => Promise<Response>, successMessage: (value: T) => string) {
    let entry = metadataQueue.current.get(key) as MetadataQueueEntry<T> | undefined;
    if (entry) entry.desired = desired;
    else { entry = { confirmed, desired, running: false }; metadataQueue.current.set(key, entry as MetadataQueueEntry<unknown>); }
    apply(desired); setNotice("");
    if (entry.running) return;
    entry.running = true;
    void (async () => {
      while (!Object.is(entry!.confirmed, entry!.desired)) {
        const sent = entry!.desired;
        try {
          const response = await send(sent); if (!response.ok) throw new Error(); entry!.confirmed = sent;
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

  function patchPrompt(id: string, patch: Partial<PromptItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function recordUse(prompt: PromptItem) {
    const response = await fetch(`/api/prompts/${prompt.id}/use`, { method: "POST" });
    if (!response.ok) throw new Error();
    const result = await response.json() as { usage: { useCount: number; lastUsedAt: string } };
    patchPrompt(prompt.id, result.usage);
  }

  async function copy(prompt: PromptItem) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(prompt.plainText);
    } catch { setManualCopy(prompt); return; }
    try { await recordUse(prompt); setNotice(`${prompt.title} 프롬프트를 복사했습니다.`); }
    catch { setNotice("프롬프트는 복사했지만 최근 사용 기록을 저장하지 못했습니다."); }
  }

  async function completeManualCopy(prompt: PromptItem) {
    try { await recordUse(prompt); setNotice(`${prompt.title} 프롬프트를 복사했습니다.`); }
    catch { setNotice("수동 복사 내용은 유지했지만 최근 사용 기록을 저장하지 못했습니다."); }
    setManualCopy(null);
  }

  async function duplicate(prompt: PromptItem) {
    if (duplicating) return;
    const requestId = duplicateRequests.current.get(prompt.id) ?? crypto.randomUUID();
    duplicateRequests.current.set(prompt.id, requestId); setDuplicating(prompt.id); setNotice("");
    try {
      const response = await fetch(`/api/prompts/${prompt.id}/duplicate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { prompt: { id: string } };
      duplicateRequests.current.delete(prompt.id);
      window.location.assign(`/prompts/${result.prompt.id}?from=duplicate`);
    } catch { setNotice("프롬프트를 복제하지 못했습니다. 다시 시도해 주세요."); setDuplicating(null); }
  }

  function clearFilters() {
    setSearch(""); setAppliedSearch(""); setSong(""); setFavorite(false); setRecent(false); setSort("favorite_first");
  }
  const filtered = Boolean(appliedSearch || song || favorite || recent);

  return <section className="prompts-page" aria-labelledby="prompts-title">
    <header className="prompts-heading"><div><p className="eyebrow">Prompt library · Private beta</p><h1 id="prompts-title" tabIndex={-1} data-login-focus>프롬프트</h1><p>자주 쓰는 스타일 조합을 저장하고 Suno에 바로 옮기세요.</p></div><a className="primary-link new-prompt-link" href="/prompts/new">＋ 새 프롬프트</a></header>
    <div className="prompt-toolbar">
      <label className="search-field"><span className="sr-only">프롬프트 검색</span><span aria-hidden="true">⌕</span><input value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} placeholder="제목, 토큰 또는 연결 곡 검색" type="search" /></label>
      <label className="select-field"><span>연결 곡</span><select aria-label="프롬프트 연결 곡 필터" value={song} onChange={(event) => setSong(event.target.value)}><option value="">모든 곡</option>{filters.songs.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <label className="select-field"><span>정렬</span><select aria-label="프롬프트 정렬" value={sort} onChange={(event) => setSort(event.target.value as PromptSort)}>{SORTS.map((value) => <option value={value} key={value}>{SORT_LABELS[value]}</option>)}</select></label>
    </div>
    <div className="prompt-filter-chips" aria-label="프롬프트 빠른 필터">
      <button type="button" className={!favorite && !recent ? "active" : ""} aria-pressed={!favorite && !recent} onClick={() => { setFavorite(false); setRecent(false); }}>전체</button>
      <button type="button" className={favorite ? "active" : ""} aria-pressed={favorite} onClick={() => setFavorite((value) => !value)}>★ 즐겨찾기</button>
      <button type="button" className={recent ? "active" : ""} aria-pressed={recent} onClick={() => setRecent((value) => !value)}>◷ 최근 사용</button>
    </div>
    <div className="list-summary" aria-live="polite"><strong>{loading ? "프롬프트를 불러오는 중" : `총 ${totalCount}개`}</strong><span>{filtered ? "현재 검색 조건" : "내 개인 프롬프트 보관함"}</span></div>
    {notice ? <p className="copy-toast" role="status">{notice}</p> : null}
    {error ? <div className="list-error" role="alert"><strong>{error}</strong><button type="button" onClick={() => setRetryKey((value) => value + 1)}>다시 시도</button></div> : null}
    {loading ? <div className="prompt-grid" aria-label="프롬프트 목록 불러오는 중">{Array.from({ length: 6 }, (_, index) => <div className="prompt-card skeleton" key={index} aria-hidden="true" />)}</div> : null}
    {!loading && !error && items.length === 0 ? <div className="empty-state prompt-empty"><span aria-hidden="true">{filtered ? "⌕" : "✦"}</span><h2>{filtered ? "조건에 맞는 프롬프트가 없어요" : "자주 쓰는 스타일 조합을 만들어보세요"}</h2><p>{filtered ? "검색어·즐겨찾기·최근 사용·연결 곡 조건을 바꿔보세요." : "장르, 보컬, 분위기와 악기를 토큰으로 모아 빠르게 재사용할 수 있어요."}</p>{filtered ? <button className="secondary-button" type="button" onClick={clearFilters}>검색 조건 지우기</button> : <a className="primary-link" href="/prompts/new">첫 프롬프트 만들기</a>}</div> : null}
    {!loading && items.length ? <div className="prompt-grid">{items.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} duplicating={duplicating === prompt.id} onToggle={toggle} onCopy={copy} onDuplicate={duplicate} />)}</div> : null}
    {!loading && items.length ? <div className="load-more-wrap"><button className="secondary-button load-more" type="button" disabled={!nextCursor || loadingMore} onClick={() => void loadMore()}>{loadingMore ? "불러오는 중…" : nextCursor ? "더 불러오기" : "모든 프롬프트를 불러왔습니다"}</button></div> : null}
    {manualCopy ? <div className="rhyme-dialog-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setManualCopy(null); }}><section className="manual-copy-dialog" role="dialog" aria-modal="true" aria-labelledby="prompt-copy-title"><p className="eyebrow">Clipboard fallback</p><h2 id="prompt-copy-title">{manualCopy.title} 프롬프트를 직접 복사해 주세요</h2><p>브라우저가 클립보드 쓰기를 허용하지 않았습니다. 아래 쉼표 문자열이 선택되어 있습니다.</p><textarea ref={manualText} readOnly value={manualCopy.plainText} /><div className="dialog-actions"><button type="button" onClick={() => setManualCopy(null)}>취소</button><button className="primary-link" type="button" onClick={() => void completeManualCopy(manualCopy)}>복사 완료</button></div></section></div> : null}
  </section>;
}

function PromptCard({ prompt, duplicating, onToggle, onCopy, onDuplicate }: {
  prompt: PromptItem; duplicating: boolean;
  onToggle: (prompt: PromptItem, field: "isFavorite" | "isPinned") => void;
  onCopy: (prompt: PromptItem) => void; onDuplicate: (prompt: PromptItem) => void;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  function cancel() { if (timer.current !== null) window.clearTimeout(timer.current); timer.current = null; start.current = null; }
  function down(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch" || (event.target as Element).closest("button")) return;
    start.current = { x: event.clientX, y: event.clientY }; longPressed.current = false;
    timer.current = window.setTimeout(() => { longPressed.current = true; timer.current = null; void onCopy(prompt); }, 650);
  }
  function move(event: PointerEvent<HTMLElement>) {
    if (!start.current) return;
    if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel();
  }
  return <article className="prompt-card" onPointerDown={down} onPointerMove={move} onPointerUp={cancel} onPointerCancel={cancel}
    onClickCapture={(event) => { if (longPressed.current) { event.preventDefault(); event.stopPropagation(); longPressed.current = false; } }}>
    <a className="prompt-card-hit" href={`/prompts/${prompt.id}`} aria-label={`${prompt.title} 프롬프트 열기`}><span className="sr-only">{prompt.title}</span></a>
    <div className="prompt-card-top"><h2>{prompt.title}</h2><span className="prompt-card-actions"><button type="button" className={prompt.isPinned ? "is-on" : ""} aria-label={`${prompt.title} ${prompt.isPinned ? "고정 해제" : "고정"}`} aria-pressed={prompt.isPinned} onClick={() => void onToggle(prompt, "isPinned")}>⌁</button><button type="button" className={prompt.isFavorite ? "is-on" : ""} aria-label={`${prompt.title} ${prompt.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} aria-pressed={prompt.isFavorite} onClick={() => void onToggle(prompt, "isFavorite")}>★</button></span></div>
    <TokenPreview prompt={prompt} />
    <p className="prompt-copy-hint">모바일에서는 카드를 길게 눌러도 복사할 수 있습니다.</p>
    <div className="prompt-card-buttons"><button type="button" onClick={() => void onCopy(prompt)}>⧉ 복사</button><button type="button" disabled={duplicating} onClick={() => void onDuplicate(prompt)}>{duplicating ? "복제 중…" : "복제"}</button></div>
    <footer><span>{prompt.linkedSongs.length ? prompt.linkedSongs.map(({ title }) => title).join(", ") : "연결 곡 없음"}</span><time dateTime={prompt.lastUsedAt ?? prompt.updatedAt}>{prompt.lastUsedAt ? `${relativeDate(prompt.lastUsedAt)} 사용` : `${relativeDate(prompt.updatedAt)} 수정`}</time></footer>
  </article>;
}

function TokenPreview({ prompt }: { prompt: PromptItem }) {
  return <div className="prompt-token-preview">
    <ul className="prompt-tokens desktop-tokens" aria-label={`${prompt.title} 핵심 토큰`}>{prompt.tokens.slice(0, 5).map((token) => <li key={token.normalizedValue}>{token.displayValue}</li>)}{prompt.tokens.length > 5 ? <li>+{prompt.tokens.length - 5}</li> : null}{prompt.tokens.length === 0 ? <li className="is-empty">토큰 없음</li> : null}</ul>
    <ul className="prompt-tokens mobile-tokens" aria-label={`${prompt.title} 핵심 토큰`}>{prompt.tokens.slice(0, 3).map((token) => <li key={token.normalizedValue}>{token.displayValue}</li>)}{prompt.tokens.length > 3 ? <li>+{prompt.tokens.length - 3}</li> : null}{prompt.tokens.length === 0 ? <li className="is-empty">토큰 없음</li> : null}</ul>
  </div>;
}

function makeParams(search: string, song: string, favorite: boolean, recent: boolean, sort: PromptSort): URLSearchParams {
  const params = new URLSearchParams(); if (search) params.set("search", search); if (song) params.set("song", song);
  if (favorite) params.set("favorite", "true"); if (recent) params.set("recent", "true");
  if (sort !== "favorite_first") params.set("sort", sort); return params;
}

function relativeDate(value: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "오늘"; if (days === 1) return "어제"; if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
