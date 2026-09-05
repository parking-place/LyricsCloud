"use client";

import { LYRIC_STATUS_LABELS, type LyricRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SongStatus = "idea" | "writing_lyrics" | "revising" | "suno_generating" | "mixing" | "completed" | "on_hold";
type ResourceColor = "red" | "yellow" | "green" | "blue" | "gray";

interface DashboardSong {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: SongStatus;
  readonly color: ResourceColor | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly updatedAt: string;
  readonly counts: {
    readonly lyrics: { readonly value: number; readonly available: true };
    readonly prompts: { readonly value: 0; readonly available: false };
    readonly rhymes: { readonly value: 0; readonly available: false };
  };
}

const STATUS_LABELS: Record<SongStatus, string> = {
  idea: "아이디어", writing_lyrics: "가사 작성 중", revising: "수정 중", suno_generating: "Suno 생성 중",
  mixing: "믹싱 중", completed: "완성", on_hold: "보류"
};

export function SongDashboard({ initialSong, initialLyrics, returnTo }: {
  initialSong: DashboardSong;
  initialLyrics: readonly LyricRecord[];
  returnTo: string;
}) {
  const [song, setSong] = useState(initialSong);
  const [lyrics, setLyrics] = useState(() => sortLyrics(initialLyrics));
  const [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lyricDeleteTarget, setLyricDeleteTarget] = useState<LyricRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyLyricId, setBusyLyricId] = useState<string | null>(null);
  const router = useRouter();
  const encodedReturn = encodeURIComponent(returnTo);

  async function toggleSong(field: "isFavorite" | "isPinned") {
    const previous = song;
    const value = !song[field];
    setNotice("");
    setSong({ ...song, [field]: value });
    const path = field === "isFavorite" ? "favorite" : "pin";
    const body = field === "isPinned" ? { value, pinOrder: value ? 0 : null } : { value };
    try {
      const response = await fetch(`/api/songs/${song.id}/${path}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error();
      const result = await response.json() as { song: DashboardSong };
      setSong((current) => ({ ...current, ...result.song, counts: current.counts }));
      setNotice(`${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${value ? "설정" : "해제"}했습니다.`);
    } catch {
      setSong(previous);
      setNotice("변경을 저장하지 못해 이전 상태로 되돌렸습니다.");
    }
  }

  async function createLyric() {
    if (creating) return;
    setCreating(true);
    setNotice("");
    try {
      const response = await fetch(`/api/songs/${song.id}/lyrics`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), title: "새 가사", body: "", memo: "", status: "draft" })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { lyric: LyricRecord };
      router.push(`/lyrics/${result.lyric.id}`);
      router.refresh();
    } catch {
      setCreating(false);
      setNotice("새 가사를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function duplicateLyric(lyric: LyricRecord) {
    if (busyLyricId) return;
    setBusyLyricId(lyric.id);
    setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}/duplicate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: crypto.randomUUID() })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { lyric: LyricRecord };
      router.push(`/lyrics/${result.lyric.id}`);
      router.refresh();
    } catch {
      setBusyLyricId(null);
      setNotice("가사를 복제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function toggleLyricFavorite(lyric: LyricRecord) {
    if (busyLyricId) return;
    const value = !lyric.isFavorite;
    setBusyLyricId(lyric.id);
    setNotice("");
    setLyrics((current) => current.map((item) => item.id === lyric.id ? { ...item, isFavorite: value } : item));
    try {
      const response = await fetch(`/api/lyrics/${lyric.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowVersion: lyric.rowVersion, isFavorite: value })
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { lyric: LyricRecord };
      setLyrics((current) => sortLyrics(current.map((item) => item.id === lyric.id ? result.lyric : item)));
      setNotice(`${lyric.title}을${value ? " 즐겨찾기에 추가했습니다." : " 즐겨찾기에서 해제했습니다."}`);
    } catch {
      setLyrics((current) => current.map((item) => item.id === lyric.id ? lyric : item));
      setNotice("가사 즐겨찾기를 저장하지 못해 이전 상태로 되돌렸습니다.");
    } finally { setBusyLyricId(null); }
  }

  async function deleteLyric() {
    const target = lyricDeleteTarget;
    if (!target || busyLyricId) return;
    setBusyLyricId(target.id);
    setNotice("");
    try {
      const response = await fetch(`/api/lyrics/${target.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      setLyrics((current) => current.filter((item) => item.id !== target.id));
      setSong((current) => ({ ...current, counts: { ...current.counts, lyrics: { value: Math.max(0, current.counts.lyrics.value - 1), available: true } } }));
      setLyricDeleteTarget(null);
      setNotice(`${target.title}을 삭제했습니다.`);
      router.refresh();
    } catch {
      setNotice("가사를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusyLyricId(null); }
  }

  async function deleteSong() {
    if (deleting) return;
    setDeleting(true);
    setNotice("");
    try {
      const response = await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
      const result = await response.json() as { deleted?: boolean };
      if (!response.ok || !result.deleted) throw new Error();
      router.replace(returnTo);
      router.refresh();
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
      setNotice("곡을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return <section className="dashboard-page" aria-labelledby="dashboard-title">
    {notice ? <p className={notice.includes("못") ? "dashboard-notice is-error" : "dashboard-notice"} role="status">{notice}</p> : null}
    <header className={`dashboard-heading${song.color ? ` color-${song.color}` : ""}`}>
      <div className="dashboard-title-copy"><a className="back-inline" href={returnTo}>← 곡 목록</a><div className="dashboard-badges"><span className={`status-badge status-${song.status}`}>{STATUS_LABELS[song.status]}</span>{song.color ? <span className={`color-name color-${song.color}`}><i aria-hidden="true" />{colorLabel(song.color)}</span> : <span className="color-name">색상 없음</span>}</div><h1 id="dashboard-title">{song.title}</h1><p>{song.description || "아직 곡 설명이 없습니다. 수정 화면에서 곡의 방향을 남겨보세요."}</p><time dateTime={song.updatedAt}>최근 수정 {formatDate(song.updatedAt)}</time></div>
      <div className="dashboard-actions"><button type="button" aria-pressed={song.isPinned} className={song.isPinned ? "secondary-button is-on" : "secondary-button"} onClick={() => toggleSong("isPinned")}>⌁ {song.isPinned ? "고정됨" : "고정"}</button><button type="button" aria-pressed={song.isFavorite} className={song.isFavorite ? "secondary-button is-on" : "secondary-button"} onClick={() => toggleSong("isFavorite")}>★ {song.isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button><a className="primary-link" href={`/songs/${song.id}/edit?returnTo=${encodedReturn}`}>곡 정보 수정</a></div>
    </header>

    <div className="dashboard-layout">
      <main className="dashboard-main">
        <section className="count-grid" aria-label="곡 자료 요약"><Count label="가사" value={song.counts.lyrics.value} available /><Count label="프롬프트" value={song.counts.prompts.value} /><Count label="라임 노트" value={song.counts.rhymes.value} /></section>
        <section className={`dashboard-panel lyrics-panel${lyrics.length ? "" : " is-empty"}`} aria-labelledby="lyrics-heading">
          <div className="lyrics-panel-heading"><div><p className="eyebrow">Lyrics</p><h2 id="lyrics-heading">가사 작업 공간</h2></div><button className="primary-button" type="button" disabled={creating} onClick={createLyric}>{creating ? "만드는 중…" : "＋ 새 가사"}</button></div>
          {lyrics.length === 0 ? <div className="lyrics-empty-copy"><span className="empty-icon" aria-hidden="true">≋</span><h3>첫 가사를 시작해보세요</h3><p>새 가사를 만들면 이 곡에 연결된 편집기로 바로 이동합니다.</p><button className="secondary-button" type="button" disabled={creating} onClick={createLyric}>첫 가사 작성</button></div>
            : <div className="lyric-card-list">{lyrics.map((lyric) => <LyricCard key={lyric.id} lyric={lyric} busy={busyLyricId === lyric.id} onFavorite={toggleLyricFavorite} onDuplicate={duplicateLyric} onDelete={setLyricDeleteTarget} />)}</div>}
        </section>
      </main>
      <aside className="dashboard-side">
        <section className="dashboard-panel notes-panel"><p className="eyebrow">Work notes</p><h2>작업 메모</h2><p className={song.workNotes ? "" : "muted-copy"}>{song.workNotes || "아직 작업 메모가 없습니다. 곡 정보 수정에서 다음 할 일을 기록해보세요."}</p></section>
        <section className="dashboard-panel linked-empty"><p className="eyebrow">Linked resources</p><h2>연결 자료</h2><span aria-hidden="true">◇</span><h3>연결된 자료가 없어요</h3><p>라임 노트와 프롬프트 연결은 각각의 기능이 열리면 이곳에 표시됩니다.</p></section>
        <section className="danger-zone"><h2>곡 관리</h2><p>삭제한 곡은 목록에서 숨겨집니다.</p><button type="button" onClick={() => setDeleteOpen(true)}>곡 삭제</button></section>
      </aside>
    </div>

    {lyricDeleteTarget ? <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="lyric-delete-title" aria-describedby="lyric-delete-description"><p className="eyebrow">Soft delete</p><h2 id="lyric-delete-title">‘{lyricDeleteTarget.title}’ 가사를 삭제할까요?</h2><p id="lyric-delete-description">이 가사를 목록과 검색에서 숨깁니다. 같은 곡의 다른 가사는 유지됩니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={Boolean(busyLyricId)} onClick={() => setLyricDeleteTarget(null)}>취소</button><button className="danger-button" type="button" disabled={Boolean(busyLyricId)} onClick={deleteLyric}>{busyLyricId ? "삭제 중…" : "가사 삭제 확인"}</button></div></div></div> : null}
    {deleteOpen ? <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><p className="eyebrow">Soft delete</p><h2 id="delete-title">‘{song.title}’ 곡을 삭제할까요?</h2><p id="delete-description">목록에서 이 곡을 숨기며 현재 활성 가사도 함께 숨겨집니다. 연결된 독립 자료는 삭제되지 않습니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-button" type="button" disabled={deleting} onClick={deleteSong}>{deleting ? "삭제 중…" : "곡 삭제 확인"}</button></div></div></div> : null}
  </section>;
}

function LyricCard({ lyric, busy, onFavorite, onDuplicate, onDelete }: {
  lyric: LyricRecord;
  busy: boolean;
  onFavorite: (lyric: LyricRecord) => void;
  onDuplicate: (lyric: LyricRecord) => void;
  onDelete: (lyric: LyricRecord) => void;
}) {
  const preview = lyric.body.trim().split("\n").filter(Boolean).slice(0, 3).join(" · ");
  return <article className={`lyric-card${lyric.isPinned ? " is-pinned" : ""}`}>
    <div className="lyric-card-copy"><div><span className={`lyric-status status-${lyric.status}`}>{LYRIC_STATUS_LABELS[lyric.status]}</span>{lyric.isPinned ? <span className="pinned-label">고정</span> : null}</div><h3><a href={`/lyrics/${lyric.id}`}>{lyric.title}</a></h3><p className={preview ? "" : "is-empty"}>{preview || "아직 가사 본문이 없습니다."}</p><time dateTime={lyric.updatedAt}>{formatDate(lyric.updatedAt)}</time></div>
    <div className="lyric-card-actions"><button type="button" disabled={busy} aria-pressed={lyric.isFavorite} aria-label={`${lyric.title} ${lyric.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} onClick={() => onFavorite(lyric)}>★</button><button type="button" disabled={busy} onClick={() => onDuplicate(lyric)}>복제</button><button type="button" disabled={busy} className="danger-text" onClick={() => onDelete(lyric)}>삭제</button></div>
  </article>;
}

function Count({ label, value, available = false }: { label: string; value: number; available?: boolean }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{available ? "현재 자료" : "아직 지원 전"}</small></article>;
}

function sortLyrics(values: readonly LyricRecord[]) {
  return [...values].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function colorLabel(color: ResourceColor) {
  return ({ red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" } as const)[color];
}
