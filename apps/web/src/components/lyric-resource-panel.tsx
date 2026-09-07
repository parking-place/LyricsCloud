"use client";

import {
  EDITOR_RESOURCE_TABS,
  LYRIC_STATUS_LABELS,
  type EditorResourcePanelItem,
  type EditorResourcePanelResult,
  type EditorResourceScope,
  type EditorResourceTab
} from "@lyricscloud/domain";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const TAB_LABELS: Record<EditorResourceTab, string> = {
  songs: "다른 곡", lyrics: "다른 가사", rhymes: "라임", prompts: "프롬프트"
};

export function LyricResourcePanel({ lyricId, desktopOpen, mobileOpen, width, settings, onClose, onWidth, onOpen }: {
  lyricId: string;
  desktopOpen: boolean;
  mobileOpen: boolean;
  width: number;
  settings: ReactNode;
  onClose: () => void;
  onWidth: (width: number) => void;
  onOpen: (item: EditorResourcePanelItem) => Promise<"opened" | "deleted" | "failed">;
}) {
  const [tab, setTab] = useState<EditorResourceTab>("lyrics");
  const [scope, setScope] = useState<EditorResourceScope>("linked");
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [searches, setSearches] = useState<Record<EditorResourceTab, string>>({ songs: "", lyrics: "", rhymes: "", prompts: "" });
  const [result, setResult] = useState<EditorResourcePanelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const search = searches[tab];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ tab, scope, limit: "50" });
      if (search.trim()) params.set("search", search);
      try {
        const response = await fetch(`/api/lyrics/${lyricId}/resources?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("RESOURCE_PANEL_UNAVAILABLE");
        const next = await response.json() as EditorResourcePanelResult;
        setResult(next);
      } catch (cause) {
        if ((cause as { name?: string }).name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [lyricId, retry, scope, search, tab]);

  useEffect(() => {
    if (!mobileOpen) return;
    const frame = requestAnimationFrame(() => tabRefs.current[EDITOR_RESOURCE_TABS.indexOf(tab)]?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mobileOpen, tab]);

  useEffect(() => {
    if (!mobileOpen) return;
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [mobileOpen, onClose]);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % EDITOR_RESOURCE_TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + EDITOR_RESOURCE_TABS.length) % EDITOR_RESOURCE_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = EDITOR_RESOURCE_TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(EDITOR_RESOURCE_TABS[next]!);
    requestAnimationFrame(() => tabRefs.current[next]?.focus());
  }

  async function openItem(item: EditorResourcePanelItem) {
    if (await onOpen(item) !== "deleted") return;
    setResult((current) => current ? {
      ...current,
      items: current.items.map((candidate) => candidate.kind === item.kind && candidate.id === item.id
        ? { ...candidate, availability: "deleted" }
        : candidate)
    } : current);
  }

  const visible = result?.tab === tab && result.scope === (tab === "rhymes" || tab === "prompts" ? scope : "all")
    && result.search === search.trim();

  return <div className={`editor-resource-shell${desktopOpen ? " is-desktop-open" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
    onPointerDown={(event) => { if (mobileOpen && event.target === event.currentTarget) onClose(); }}>
    <aside className="editor-resource-panel" style={{ "--resource-panel-width": `${width}px` } as CSSProperties}
      role={mobileOpen ? "dialog" : "complementary"} aria-modal={mobileOpen || undefined} aria-labelledby="editor-resource-title">
      <div className="sheet-handle" aria-hidden="true" />
      <header className="editor-resource-heading">
        <div><p className="eyebrow">Reference</p><h2 id="editor-resource-title">작업 자료 · 다른 가사와 설정</h2></div>
        <button type="button" onClick={onClose}>{mobileOpen ? "닫기" : "패널 접기"}</button>
      </header>
      <details className="editor-current-settings" open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}><summary>현재 가사 설정</summary>{settings}</details>
      <div className="editor-resource-tabs" role="tablist" aria-label="작업 자료 종류">
        {EDITOR_RESOURCE_TABS.map((value, index) => <button key={value} ref={(node) => { tabRefs.current[index] = node; }}
          id={`resource-tab-${value}`} role="tab" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
          aria-controls="editor-resource-results" onKeyDown={(event) => moveTab(event, index)} onClick={() => setTab(value)}>{TAB_LABELS[value]}</button>)}
      </div>
      {(tab === "rhymes" || tab === "prompts") ? <div className="editor-resource-scope" role="group" aria-label={`${TAB_LABELS[tab]} 표시 범위`}>
        <button type="button" aria-pressed={scope === "linked"} onClick={() => setScope("linked")}>연결 자료</button>
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>전체 자료</button>
      </div> : null}
      <label className="editor-resource-search"><span className="sr-only">{TAB_LABELS[tab]} 검색</span><span aria-hidden="true">⌕</span>
        <input value={search} maxLength={200} placeholder={`${TAB_LABELS[tab]} 검색`} onChange={(event) => setSearches((current) => ({ ...current, [tab]: event.target.value }))} />
        {search ? <button type="button" aria-label={`${TAB_LABELS[tab]} 검색어 지우기`} onClick={() => setSearches((current) => ({ ...current, [tab]: "" }))}>×</button> : null}
      </label>
      <div className="editor-resource-results" id="editor-resource-results" role="tabpanel" aria-labelledby={`resource-tab-${tab}`} aria-busy={loading}>
        {loading ? <PanelMessage title="자료를 불러오는 중…" detail={`${TAB_LABELS[tab]} 목록을 확인하고 있습니다.`} />
          : error ? <PanelMessage title="자료를 불러오지 못했습니다" detail="현재 가사와 입력은 그대로 유지됩니다." action={<button type="button" onClick={() => setRetry((value) => value + 1)}>다시 시도</button>} />
          : visible && result && result.items.length ? <ul aria-label={tab === "lyrics" ? "다른 가사 목록" : `${TAB_LABELS[tab]} 목록`}>{result.items.map((item) => <ResourceItem key={`${item.kind}-${item.id}`} item={item} onOpen={(candidate) => { void openItem(candidate); }} />)}</ul>
          : <EmptyMessage tab={tab} scope={scope} searched={Boolean(search.trim())} />}
      </div>
      <label className="editor-resource-width"><span>패널 너비</span><input type="range" min="240" max="400" step="8" value={width} onChange={(event) => onWidth(Number(event.target.value))} /><output>{width}px</output></label>
    </aside>
  </div>;
}

function ResourceItem({ item, onOpen }: { item: EditorResourcePanelItem; onOpen: (item: EditorResourcePanelItem) => void }) {
  const deleted = item.availability === "deleted";
  const href = item.kind === "song" ? `/songs/${item.id}` : item.kind === "lyrics" ? `/lyrics/${item.id}`
    : item.kind === "rhyme_note" ? `/rhymes/${item.id}` : `/prompts/${item.id}`;
  return <li className={item.availability === "current" ? "is-current" : deleted ? "is-deleted" : ""}>
    <div className="editor-resource-card-heading"><strong>{item.title}</strong>
      {item.availability === "current" ? <span>현재 가사</span> : deleted ? <span>삭제됨</span>
        : (item.kind === "rhyme_note" || item.kind === "prompt") && item.isLinked ? <span>현재 곡 연결됨</span> : null}
    </div>
    <p>{deleted ? "이 자료는 삭제되어 더 이상 열 수 없습니다." : item.preview || "미리보기 내용이 없습니다."}</p>
    <small>{item.kind === "lyrics" ? `${LYRIC_STATUS_LABELS[item.status]} · ` : item.kind === "song" ? `가사 ${item.lyricCount}개 · ` : ""}{formatDate(item.updatedAt)}</small>
    <div className="editor-resource-actions">
      <button type="button" aria-label={`${item.title} ${item.kind === "song" ? "이 곡으로 전환" : item.kind === "lyrics" ? "이 가사로 전환" : "자료 열기"}`}
        disabled={deleted || item.availability === "current"} onClick={() => onOpen(item)}>{item.kind === "song" ? "이 곡으로 전환" : item.kind === "lyrics" ? "이 가사로 전환" : "자료 열기"}</button>
      {!deleted && item.availability !== "current" ? <a href={href} target="_blank" rel="noreferrer">새 창에서 열기</a> : null}
    </div>
  </li>;
}

function EmptyMessage({ tab, scope, searched }: { tab: EditorResourceTab; scope: EditorResourceScope; searched: boolean }) {
  if (searched) return <PanelMessage title="검색 결과가 없습니다" detail="검색어를 바꾸거나 지우고 다시 확인해 보세요." />;
  if ((tab === "rhymes" || tab === "prompts") && scope === "linked") {
    return <PanelMessage title={`연결된 ${TAB_LABELS[tab]} 자료가 없습니다`} detail="전체 자료로 전환하면 내 라이브러리를 계속 탐색할 수 있습니다." />;
  }
  return <PanelMessage title={`${TAB_LABELS[tab]} 자료가 없습니다`} detail="자료를 만든 뒤 이 화면에서 다시 찾아볼 수 있습니다." />;
}

function PanelMessage({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="editor-resource-message"><strong>{title}</strong><p>{detail}</p>{action}</div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
