"use client";

import { useEffect, useRef, useState } from "react";

export type SongLinkKind = "rhyme_note" | "prompt";
type LinkState = "all" | "linked" | "unlinked";

interface SongLinkItem {
  readonly id: string;
  readonly type: SongLinkKind;
  readonly title: string;
  readonly preview: string;
  readonly isLinked: boolean;
  readonly updatedAt: string;
}

interface PendingChange {
  readonly item: SongLinkItem;
  readonly original: boolean;
  readonly desired: boolean;
}

export function SongLinkManager({ songId, songTitle, kind, onKindChange, onClose, onChanged }: {
  songId: string;
  songTitle: string;
  kind: SongLinkKind;
  onKindChange: (kind: SongLinkKind) => void;
  onClose: () => void;
  onChanged: (kind: SongLinkKind) => Promise<void> | void;
}) {
  const [items, setItems] = useState<readonly SongLinkItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState<LinkState>("all");
  const [changes, setChanges] = useState<ReadonlyMap<string, PendingChange>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);

  const label = kind === "rhyme_note" ? "라임 노트" : "프롬프트";
  const pending = [...changes.values()].filter((change) => change.original !== change.desired);
  const linkIds = pending.filter((change) => change.desired).map((change) => change.item.id);
  const unlinkChanges = pending.filter((change) => !change.desired);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    const query = new URLSearchParams({ type: kind, state, limit: "20" });
    if (search) query.set("search", search);
    fetch(`/api/songs/${songId}/links?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ items: SongLinkItem[]; totalCount: number; nextCursor: string | null }>;
      })
      .then((result) => {
        setItems(result.items);
        setTotalCount(result.totalCount);
        setNextCursor(result.nextCursor);
      })
      .catch((cause) => { if ((cause as Error).name !== "AbortError") setLoadError(`${label} 후보를 불러오지 못했습니다.`); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, label, reloadKey, search, songId, state]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      if (confirming) {
        setConfirming(false);
        window.setTimeout(() => applyRef.current?.focus());
      } else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirming, onClose, saving]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError("");
    const query = new URLSearchParams({ type: kind, state, limit: "20", cursor: nextCursor });
    if (search) query.set("search", search);
    try {
      const response = await fetch(`/api/songs/${songId}/links?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: SongLinkItem[]; totalCount: number; nextCursor: string | null };
      setItems((current) => [...current, ...result.items.filter((item) => !current.some(({ id }) => id === item.id))]);
      setTotalCount(result.totalCount);
      setNextCursor(result.nextCursor);
    } catch { setLoadError("후보를 더 불러오지 못했습니다. 다시 시도해 주세요."); }
    finally { setLoadingMore(false); }
  }

  function selectKind(value: SongLinkKind) {
    if (value === kind) return;
    setChanges(new Map());
    setSearchInput("");
    setSearch("");
    setState("all");
    onKindChange(value);
    window.setTimeout(() => searchRef.current?.focus());
  }

  function toggle(item: SongLinkItem) {
    setChanges((current) => {
      const next = new Map(current);
      const prior = next.get(item.id);
      const original = prior?.original ?? item.isLinked;
      const desired = !(prior?.desired ?? item.isLinked);
      if (original === desired) next.delete(item.id);
      else next.set(item.id, { item, original, desired });
      return next;
    });
  }

  async function applyChanges(confirmed = false) {
    if (!pending.length || saving) return;
    if (unlinkChanges.length && !confirmed) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(`/api/songs/${songId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: kind, linkIds, unlinkIds: unlinkChanges.map((change) => change.item.id) })
      });
      if (!response.ok) throw new Error();
      await onChanged(kind);
      onClose();
    } catch {
      setConfirming(false);
      setSaveError("연결 변경을 저장하지 못했습니다. 선택은 유지되므로 다시 적용할 수 있습니다.");
      window.setTimeout(() => applyRef.current?.focus());
    } finally { setSaving(false); }
  }

  return <div className="song-link-backdrop" role="presentation">
    <section className="song-link-dialog" role="dialog" aria-modal="true" aria-labelledby="song-link-title">
      <div className="sheet-handle" aria-hidden="true" />
      <header><div><p className="eyebrow">Linked resources</p><h2 id="song-link-title">{songTitle} 연결 자료 관리</h2><p>자료를 여러 개 선택한 뒤 한 번에 적용할 수 있습니다.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="연결 관리 닫기">닫기</button></header>
      <div className="song-link-tabs" role="tablist" aria-label="자료 유형">
        <button type="button" role="tab" aria-selected={kind === "rhyme_note"} onClick={() => selectKind("rhyme_note")}>라임 노트</button>
        <button type="button" role="tab" aria-selected={kind === "prompt"} onClick={() => selectKind("prompt")}>프롬프트</button>
      </div>
      <div className="song-link-toolbar">
        <label><span>{label} 검색</span><input ref={searchRef} autoFocus value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={kind === "rhyme_note" ? "제목 또는 본문 검색" : "제목 또는 토큰 검색"} /></label>
        <div role="group" aria-label="연결 상태 필터">{(["all", "linked", "unlinked"] as const).map((value) => <button key={value} type="button" aria-pressed={state === value} onClick={() => setState(value)}>{value === "all" ? "전체" : value === "linked" ? "연결됨" : "미연결"}</button>)}</div>
      </div>
      <div className="song-link-summary"><span>결과 {totalCount.toLocaleString("ko-KR")}개</span><strong>{pending.length ? `변경 ${pending.length}개` : "변경 없음"}</strong></div>
      {loadError ? <div className="song-link-error" role="alert"><p>{loadError}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)}>다시 시도</button></div> : null}
      {saveError ? <div className="song-link-error" role="alert"><p>{saveError}</p></div> : null}
      <div className="song-link-results" aria-busy={loading}>
        {loading ? <p className="song-link-empty">{label} 후보를 불러오는 중입니다.</p>
          : items.length ? items.map((item) => {
            const checked = changes.get(item.id)?.desired ?? item.isLinked;
            return <label className={checked ? "song-link-option is-linked" : "song-link-option"} key={item.id}>
              <input type="checkbox" checked={checked} onChange={() => toggle(item)} />
              <span><strong>{item.title}</strong><small>{preview(item.preview) || (kind === "rhyme_note" ? "아직 본문이 없습니다." : "아직 토큰이 없습니다.")}</small></span>
              <em>{checked ? "연결" : "미연결"}</em>
            </label>;
          }) : <EmptyResult kind={kind} state={state} search={search} />}
        {nextCursor && !loading ? <button className="song-link-more" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "불러오는 중…" : "더 불러오기"}</button> : null}
      </div>
      <footer><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>취소</button><button ref={applyRef} className="primary-button" type="button" disabled={!pending.length || saving} onClick={() => void applyChanges()}>{saving ? "적용 중…" : `변경 ${pending.length}개 적용`}</button></footer>
      {confirming ? <div className="song-unlink-confirm" role="alertdialog" aria-modal="true" aria-labelledby="song-unlink-title" aria-describedby="song-unlink-description">
        <p className="eyebrow">연결만 해제</p><h3 id="song-unlink-title">{songTitle}에서 {unlinkChanges.length}개 자료의 연결을 해제할까요?</h3>
        <p id="song-unlink-description">{unlinkChanges.slice(0, 3).map(({ item }) => item.title).join(" · ")}{unlinkChanges.length > 3 ? ` 외 ${unlinkChanges.length - 3}개` : ""}. 자료 자체는 삭제되지 않고 원래 라이브러리에 그대로 남습니다.</p>
        <div><button autoFocus className="secondary-button" type="button" disabled={saving} onClick={() => { setConfirming(false); window.setTimeout(() => applyRef.current?.focus()); }}>돌아가기</button><button className="danger-button" type="button" disabled={saving} onClick={() => void applyChanges(true)}>{saving ? "적용 중…" : "연결 해제 포함 적용"}</button></div>
      </div> : null}
    </section>
  </div>;
}

function EmptyResult({ kind, state, search }: { kind: SongLinkKind; state: LinkState; search: string }) {
  const label = kind === "rhyme_note" ? "라임 노트" : "프롬프트";
  if (search) return <p className="song-link-empty">‘{search}’ 검색 결과가 없습니다. 다른 제목이나 {kind === "rhyme_note" ? "본문" : "토큰"}을 입력해 보세요.</p>;
  if (state === "linked") return <p className="song-link-empty">이 곡에 연결된 {label}가 없습니다. 미연결 필터에서 자료를 선택할 수 있습니다.</p>;
  if (state === "unlinked") return <p className="song-link-empty">연결할 수 있는 미연결 {label}가 없습니다.</p>;
  return <div className="song-link-empty"><p>아직 만든 {label}가 없습니다.</p><a href={kind === "rhyme_note" ? "/rhymes/new" : "/prompts/new"}>새 {label} 만들기</a></div>;
}

function preview(value: string) {
  return value.trim().split(/\s*\n\s*/u).filter(Boolean).slice(0, 2).join(" · ").slice(0, 180);
}
