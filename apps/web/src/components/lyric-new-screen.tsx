"use client";

import { LYRIC_LIMITS, type LyricRecord, type TemplateRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SongListItem { readonly id: string; readonly title: string; readonly lyricCount: number }

export function LyricNewScreen({ currentSongId, returnTo, templateId }: { currentSongId?: string; returnTo: string; templateId?: string }) {
  const [songs, setSongs] = useState<readonly SongListItem[]>([]);
  const [songId, setSongId] = useState(currentSongId ?? "");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setNotice("");
      const params = new URLSearchParams({ sort: "updated_desc", limit: "50" });
      if (search.trim()) params.set("search", search.trim());
      try {
        const response = await fetch(`/api/songs?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as { items: SongListItem[] };
        let items = result.items;
        if (currentSongId && !search.trim() && !items.some((song) => song.id === currentSongId)) {
          const current = await fetch(`/api/songs/${currentSongId}`, { cache: "no-store", signal: controller.signal });
          if (current.ok) {
            const data = await current.json() as { song: SongListItem };
            items = [data.song, ...items];
          } else {
            setSongId("");
            setNotice("현재 곡이 삭제되었거나 접근 권한이 없습니다. 다른 부모 곡을 선택해 주세요.");
          }
        }
        setSongs(items);
        if (!songId && items.length === 1) setSongId(items[0]!.id);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") setNotice("곡 목록을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, search ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currentSongId, search]);

  useEffect(() => {
    if (!templateId) return;
    const controller = new AbortController();
    void fetch(`/api/templates/${templateId}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const result = await response.json().catch(() => ({})) as { template?: TemplateRecord };
      if (!response.ok || result.template?.type !== "lyrics") throw new Error();
      setTemplate(result.template); setTitle((value) => value || `${result.template!.title} 작업`);
    }).catch((error) => { if (error.name !== "AbortError") setNotice("선택한 가사 템플릿을 사용할 수 없습니다. 빈 문서로 시작하거나 다른 템플릿을 골라 주세요."); });
    return () => controller.abort();
  }, [templateId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !songId || !title.trim() || [...title.trim()].length > LYRIC_LIMITS.title) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch(template ? `/api/templates/${template.id}/apply` : `/api/songs/${songId}/lyrics`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template ? { requestId: requestId.current, targetType: "lyrics", title, songId }
          : { requestId: requestId.current, title, body: "", memo: "", status: "draft" })
      });
      const result = await response.json().catch(() => ({})) as { lyric?: LyricRecord; resource?: { id: string } };
      const id = result.lyric?.id ?? result.resource?.id;
      if (!response.ok || !id) throw new Error(response.status === 404 ? "PARENT_UNAVAILABLE" : "CREATE_FAILED");
      router.replace(`/lyrics/${id}?returnTo=${encodeURIComponent("/songs")}`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error && error.message === "PARENT_UNAVAILABLE"
        ? "선택한 곡이 삭제되었거나 접근 권한이 없습니다. 다른 곡을 선택해 주세요."
        : "새 가사를 만들지 못했습니다. 입력은 그대로 유지됩니다.");
      setSaving(false);
    }
  }

  const titleTooLong = [...title.trim()].length > LYRIC_LIMITS.title;
  return <section className="lyric-new-page" aria-labelledby="new-lyric-title">
    <header className="form-heading"><div><a className="back-inline" href={returnTo}>← 이전 화면</a><p className="eyebrow">Quick add · Lyrics</p><h1 id="new-lyric-title">새 가사 시작</h1><p>{template ? `“${template.title}” 구조를 독립된 새 가사에 복사합니다.` : "현재 곡을 그대로 쓰거나 내 곡 중 부모를 선택한 뒤 빈 초안을 엽니다."}</p></div></header>
    <nav className="creation-source" aria-label="가사 시작 방식"><a aria-current={!templateId ? "page" : undefined} href={`/lyrics/new${currentSongId ? `?songId=${currentSongId}` : ""}`}>빈 가사</a><a aria-current={templateId ? "page" : undefined} href="/templates?type=lyrics">템플릿에서 선택</a></nav>
    {notice ? <div className="form-error-banner" role="status"><span>{notice}</span></div> : null}
    <form className="lyric-new-form" onSubmit={submit}>
      <label className="form-field"><span className="field-label">가사 제목<em>필수</em><span className={titleTooLong ? "over" : ""}>{[...title].length} / {LYRIC_LIMITS.title}</span></span>
        <input autoFocus aria-label="가사 제목" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: Hook 초안" aria-invalid={titleTooLong} />
      </label>
      <fieldset><legend>부모 곡 선택</legend>
        {currentSongId && songId === currentSongId ? <p className="current-parent-song">현재 열려 있던 곡을 사용합니다.</p> : null}
        <label className="editor-resource-search"><span className="sr-only">부모 곡 검색</span><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="곡 제목 검색" /></label>
        {loading ? <p>곡 목록을 불러오는 중…</p> : songs.length ? <div className="parent-song-list">{songs.map((song) => <label key={song.id} className={songId === song.id ? "selected" : ""}><input type="radio" name="parent-song" value={song.id} checked={songId === song.id} onChange={() => setSongId(song.id)} /><span><strong>{song.title}</strong><small>가사 {song.lyricCount}개</small></span></label>)}</div>
          : <div className="quick-empty"><strong>선택할 곡이 없습니다</strong><p>가사는 반드시 내 곡 하나에 연결됩니다.</p><a href={`/songs/new?returnTo=${encodeURIComponent("/lyrics/new")}`}>먼저 곡 만들기</a></div>}
      </fieldset>
      <footer className="song-form-actions"><a className="secondary-button button-link" href={returnTo}>취소</a><button className="primary-link" type="submit" disabled={saving || !songId || !title.trim() || titleTooLong}>{saving ? "가사 만드는 중…" : "가사 만들고 편집"}</button></footer>
    </form>
  </section>;
}
