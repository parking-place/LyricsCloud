"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    readonly lyrics: { readonly value: number; readonly available: boolean };
    readonly prompts: { readonly value: 0; readonly available: false };
    readonly rhymes: { readonly value: 0; readonly available: false };
  };
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

export function SongDashboard({ initialSong, returnTo }: { initialSong: DashboardSong; returnTo: string }) {
  const [song, setSong] = useState(initialSong);
  const [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const encodedReturn = encodeURIComponent(returnTo);

  async function toggle(field: "isFavorite" | "isPinned") {
    const previous = song;
    const value = !song[field];
    setNotice("");
    setSong({ ...song, [field]: value });
    const path = field === "isFavorite" ? "favorite" : "pin";
    const body = field === "isPinned" ? { value, pinOrder: value ? 0 : null } : { value };
    try {
      const response = await fetch(`/api/songs/${song.id}/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error();
      const result = await response.json() as { song: DashboardSong };
      setSong((current) => ({ ...current, ...result.song, counts: current.counts }));
      setNotice(`${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${value ? "설정" : "해제"}했습니다.`);
    } catch {
      setSong(previous);
      setNotice("변경을 저장하지 못해 이전 상태로 되돌렸습니다.");
    }
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
      <div className="dashboard-actions"><button type="button" aria-pressed={song.isPinned} className={song.isPinned ? "secondary-button is-on" : "secondary-button"} onClick={() => toggle("isPinned")}>⌁ {song.isPinned ? "고정됨" : "고정"}</button><button type="button" aria-pressed={song.isFavorite} className={song.isFavorite ? "secondary-button is-on" : "secondary-button"} onClick={() => toggle("isFavorite")}>★ {song.isFavorite ? "즐겨찾기됨" : "즐겨찾기"}</button><a className="primary-link" href={`/songs/${song.id}/edit?returnTo=${encodedReturn}`}>곡 정보 수정</a></div>
    </header>

    <div className="dashboard-layout">
      <main className="dashboard-main">
        <section className="count-grid" aria-label="곡 자료 요약"><Count label="가사" value={song.counts.lyrics.value} /><Count label="프롬프트" value={song.counts.prompts.value} /><Count label="라임 노트" value={song.counts.rhymes.value} /></section>
        <section className="dashboard-panel lyrics-empty" aria-labelledby="lyrics-heading"><div><p className="eyebrow">Lyrics</p><h2 id="lyrics-heading">가사 작업 공간</h2></div><span className="empty-icon" aria-hidden="true">≋</span><h3>아직 작성된 가사가 없어요</h3><p>첫 가사 작성은 0.3.0에서 이 영역에 연결됩니다. 지금은 곡의 방향과 메모를 먼저 정리할 수 있어요.</p><span className="planned-pill">0.3.0에서 가사 작성 시작</span></section>
      </main>
      <aside className="dashboard-side">
        <section className="dashboard-panel notes-panel"><p className="eyebrow">Work notes</p><h2>작업 메모</h2><p className={song.workNotes ? "" : "muted-copy"}>{song.workNotes || "아직 작업 메모가 없습니다. 곡 정보 수정에서 다음 할 일을 기록해보세요."}</p></section>
        <section className="dashboard-panel linked-empty"><p className="eyebrow">Linked resources</p><h2>연결 자료</h2><span aria-hidden="true">◇</span><h3>연결된 자료가 없어요</h3><p>라임 노트와 프롬프트 연결은 각각의 기능이 열리면 이곳에 표시됩니다.</p></section>
        <section className="danger-zone"><h2>곡 관리</h2><p>삭제한 곡은 목록에서 숨겨집니다.</p><button type="button" onClick={() => setDeleteOpen(true)}>곡 삭제</button></section>
      </aside>
    </div>

    {deleteOpen ? <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><p className="eyebrow">Soft delete</p><h2 id="delete-title">‘{song.title}’ 곡을 삭제할까요?</h2><p id="delete-description">목록에서 이 곡을 숨깁니다. 이후 가사가 생기면 이 곡에 속한 가사도 함께 숨겨집니다. 연결된 독립 자료는 삭제되지 않습니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-button" type="button" disabled={deleting} onClick={deleteSong}>{deleting ? "삭제 중…" : "곡 삭제 확인"}</button></div></div></div> : null}
  </section>;
}

function Count({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value}</strong><small>아직 지원 전</small></article>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function colorLabel(color: ResourceColor) {
  return ({ red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" } as const)[color];
}
