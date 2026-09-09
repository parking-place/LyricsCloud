"use client";

import { parsePromptText, serializePromptTokens, type TemplateListInput, type TemplateRecord } from "@lyricscloud/domain";
import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "view" | "create" | "edit";

export function TemplateScreen({ initialQuery }: { initialQuery: TemplateListInput }) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<readonly TemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const submission = useRef<{ url: string; method: string; body: string } | null>(null);
  const active = useRef(true);
  const locked = saving || Boolean(submission.current);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);

  async function load(next = query) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: next.type, source: next.source, sort: next.sort });
      const response = await fetch(`/api/templates?${params}`, { cache: "no-store" });
      const result = await response.json() as { items?: TemplateRecord[] };
      if (!response.ok || !result.items) throw new Error();
      setItems(result.items); setSelectedId((current) => result.items!.some((item) => item.id === current) ? current : result.items![0]?.id ?? "");
    } catch { setNotice("템플릿을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [query.type, query.source, query.sort]);
  useEffect(() => {
    const params = new URLSearchParams({ type: query.type, source: query.source, sort: query.sort }); window.history.replaceState(null, "", `/templates?${params}`);
  }, [query]);

  function beginCreate() { setTitle(""); setContent(""); setMode("create"); setNotice(""); }
  function beginEdit() {
    if (!selected || selected.source === "default") return;
    setTitle(selected.title); setContent(selected.type === "lyrics" ? selected.lyricBody ?? "" : selected.tokens.map((token) => token.displayValue).join(", ")); setMode("edit"); setNotice("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !title.trim()) return;
    setSaving(true);
    try {
      const type = mode === "edit" ? selected!.type : query.type;
      const payload = type === "lyrics" ? { lyricBody: content } : { tokens: parsePromptText(content).map((token) => token.displayValue) };
      submission.current ??= mode === "create"
        ? { url: "/api/templates", method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), type, title, ...payload }) }
        : { url: `/api/templates/${selected!.id}`, method: "PUT", body: JSON.stringify({ rowVersion: selected!.rowVersion, title, ...payload }) };
      const response = await fetch(submission.current.url, { method: submission.current.method, headers: { "Content-Type": "application/json" }, body: submission.current.body });
      const result = await response.json().catch(() => ({})) as { template?: TemplateRecord };
      if ([400, 401, 403, 404, 409, 422].includes(response.status)) submission.current = null;
      if (!response.ok || !result.template) throw new Error();
      if (!active.current) return;
      submission.current = null;
      setMode("view"); await load(); setSelectedId(result.template.id); setNotice(mode === "create" ? "내 템플릿을 만들었습니다." : "템플릿을 저장했습니다.");
    } catch { if (active.current) setNotice(submission.current ? "저장 결과를 확인하지 못했습니다. 입력을 유지한 채 저장을 다시 눌러 주세요." : "템플릿을 저장하지 못했습니다. 제목·내용 길이와 중복 토큰을 확인해 주세요."); }
    finally { if (active.current) setSaving(false); }
  }

  async function duplicate() {
    if (!selected) return;
    const response = await fetch(`/api/templates/${selected.id}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID() }) });
    const result = await response.json().catch(() => ({})) as { template?: TemplateRecord };
    if (!response.ok || !result.template) return setNotice("템플릿을 복제하지 못했습니다.");
    setQuery((value) => ({ ...value, source: "user" })); setSelectedId(result.template.id); setNotice("독립된 내 템플릿 복사본을 만들었습니다.");
  }

  async function favorite() {
    if (!selected) return;
    const response = await fetch(`/api/templates/${selected.id}/favorite`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: !selected.isFavorite }) });
    if (!response.ok) return setNotice("즐겨찾기를 변경하지 못했습니다.");
    await load();
  }

  async function remove() {
    if (!selected || selected.source === "default" || !window.confirm(`“${selected.title}” 템플릿을 휴지통으로 이동할까요?`)) return;
    const response = await fetch(`/api/templates/${selected.id}`, { method: "DELETE" });
    if (!response.ok) return setNotice("템플릿을 삭제하지 못했습니다.");
    setMode("view"); await load(); setNotice("템플릿을 휴지통으로 이동했습니다.");
  }

  return <section className="templates-page" aria-labelledby="templates-title" data-pending-input={mode !== "view"}>
    <header className="templates-heading"><div><p className="eyebrow">Reusable starting points · 1.0.0</p><h1 id="templates-title" tabIndex={-1} data-login-focus>템플릿</h1><p>반복하는 가사 구조와 프롬프트 조합을 원본과 분리해 새 작업에 적용하세요.</p></div><button className="primary-link" type="button" disabled={locked} onClick={beginCreate}>＋ 새 템플릿</button></header>
    <div className="template-tabs" role="group" aria-label="템플릿 유형">{(["lyrics", "prompt"] as const).map((type) => <button disabled={locked} key={type} className={query.type === type ? "active" : ""} aria-pressed={query.type === type} onClick={() => { setMode("view"); setQuery((value) => ({ ...value, type })); }}>{type === "lyrics" ? "가사 구조" : "프롬프트"}</button>)}</div>
    <div className="template-filters"><label>출처<select disabled={locked} value={query.source} onChange={(event) => setQuery((value) => ({ ...value, source: event.target.value as TemplateListInput["source"] }))}><option value="all">기본 + 내 템플릿</option><option value="default">기본 템플릿</option><option value="user">내 템플릿</option></select></label><label>정렬<select disabled={locked} value={query.sort} onChange={(event) => setQuery((value) => ({ ...value, sort: event.target.value as TemplateListInput["sort"] }))}><option value="favorite_first">즐겨찾기 우선</option><option value="recent_used">최근 사용</option><option value="updated_desc">최근 수정</option><option value="title_asc">이름순</option></select></label></div>
    {notice ? <p className="template-notice" role="status">{notice}</p> : null}
    <div className="templates-layout">
      <aside className="template-list" aria-label="템플릿 목록">{loading ? <p>템플릿을 불러오는 중…</p> : items.length ? items.map((item) => <button disabled={locked} key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => { setSelectedId(item.id); setMode("view"); }}><span><strong>{item.title}</strong><small>{item.source === "default" ? "기본 · 읽기 전용" : "내 템플릿"}</small></span><span aria-label={item.isFavorite ? "즐겨찾기" : undefined}>{item.isFavorite ? "★" : ""}</span></button>) : <div className="template-empty"><strong>내 템플릿이 없습니다</strong><p>새 템플릿을 만들거나 기본 템플릿을 복제해 시작하세요.</p><button type="button" disabled={locked} onClick={beginCreate}>첫 템플릿 만들기</button></div>}</aside>
      <article className="template-preview">
        {mode !== "view" ? <form onSubmit={save}><p className="eyebrow">{mode === "create" ? "New template" : "Edit template"}</p><label>템플릿 제목<input autoFocus disabled={locked} value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} /></label><label>{(mode === "edit" ? selected?.type : query.type) === "lyrics" ? "가사 구조 원문" : "쉼표로 구분한 프롬프트 토큰"}<textarea disabled={locked} value={content} rows={14} onChange={(event) => setContent(event.target.value)} /></label><footer><button type="button" className="secondary-button" disabled={locked} onClick={() => setMode("view")}>취소</button><button className="primary-link" type="submit" disabled={saving}>저장</button></footer></form>
          : selected ? <><header><div><span className="template-source">{selected.source === "default" ? "기본 템플릿" : "내 템플릿"}</span><h2>{selected.title}</h2><small>{selected.lastUsedAt ? `최근 사용 ${new Date(selected.lastUsedAt).toLocaleDateString("ko-KR")}` : "아직 사용하지 않음"}</small></div><button type="button" className="template-favorite" aria-label={selected.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"} aria-pressed={selected.isFavorite} onClick={() => void favorite()}>{selected.isFavorite ? "★ 즐겨찾기" : "☆ 즐겨찾기"}</button></header><div className="template-content" aria-label="템플릿 내용 미리보기">{selected.type === "lyrics" ? <pre>{selected.lyricBody}</pre> : <ol>{selected.tokens.map((token, index) => <li key={`${token.normalizedValue}-${index}`}>{token.displayValue}</li>)}</ol>}</div><footer className="template-actions"><a className="primary-link" href={selected.type === "lyrics" ? `/lyrics/new?template=${selected.id}` : `/prompts/new?template=${selected.id}`}>이 템플릿으로 시작</a><button className="secondary-button" type="button" onClick={() => void duplicate()}>복제</button>{selected.source === "user" ? <><button className="secondary-button" type="button" onClick={beginEdit}>수정</button><button className="danger-button" type="button" onClick={() => void remove()}>삭제</button></> : null}</footer></> : <div className="template-empty"><strong>미리 볼 템플릿을 선택하세요</strong></div>}
      </article>
    </div>
  </section>;
}
