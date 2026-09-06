"use client";

import { LYRIC_STATUS_LABELS, type LyricRecord } from "@lyricscloud/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SongStatus = "idea" | "writing_lyrics" | "revising" | "suno_generating" | "mixing" | "completed" | "on_hold";
type ResourceColor = "red" | "yellow" | "green" | "blue" | "gray";

export interface DashboardSong {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly workNotes: string;
  readonly status: SongStatus;
  readonly color: ResourceColor | null;
  readonly isFavorite: boolean;
  readonly isPinned: boolean;
  readonly rowVersion: number;
  readonly updatedAt: string;
}

interface DashboardCounts {
  readonly lyrics: { readonly value: number; readonly available: true };
  readonly prompts: { readonly value: number; readonly available: true };
  readonly rhymes: { readonly value: number; readonly available: true };
}

interface RhymePreview {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly updatedAt: string;
}

interface PromptPreview {
  readonly id: string;
  readonly title: string;
  readonly plainText: string;
  readonly updatedAt: string;
}

type NoteTarget = { readonly kind: "song"; readonly title: string; readonly value: string }
  | { readonly kind: "lyric"; readonly lyric: LyricRecord; readonly title: string; readonly value: string };

const STATUS_LABELS: Record<SongStatus, string> = {
  idea: "아이디어", writing_lyrics: "가사 작성 중", revising: "수정 중", suno_generating: "Suno 생성 중",
  mixing: "믹싱 중", completed: "완성", on_hold: "보류"
};

export function SongDashboard({ initialSong, initialCounts, initialLyrics, initialRhymes, initialPrompts, returnTo }: {
  initialSong: DashboardSong;
  initialCounts: DashboardCounts | null;
  initialLyrics: readonly LyricRecord[] | null;
  initialRhymes: readonly RhymePreview[] | null;
  initialPrompts: readonly PromptPreview[] | null;
  returnTo: string;
}) {
  const [song, setSong] = useState(initialSong);
  const [counts, setCounts] = useState(initialCounts);
  const [lyrics, setLyrics] = useState(() => sortLyrics(initialLyrics ?? []));
  const [lyricsError, setLyricsError] = useState(initialLyrics === null);
  const [rhymes, setRhymes] = useState<readonly RhymePreview[] | null>(initialRhymes);
  const [prompts, setPrompts] = useState<readonly PromptPreview[] | null>(initialPrompts);
  const [notice, setNotice] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lyricDeleteTarget, setLyricDeleteTarget] = useState<LyricRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyLyricId, setBusyLyricId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<"counts" | "lyrics" | "rhymes" | "prompts" | null>(null);
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const router = useRouter();
  const encodedReturn = encodeURIComponent(returnTo);
  const lyricReturnSuffix = `?returnTo=${encodedReturn}`;

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
      setSong((current) => ({ ...current, ...result.song }));
      setNotice(`${field === "isFavorite" ? "즐겨찾기" : "고정"}를 ${value ? "설정" : "해제"}했습니다.`);
    } catch {
      setSong(previous);
      setNotice("변경을 저장하지 못해 이전 상태로 되돌렸습니다.");
    }
  }

  async function retryCounts() {
    if (retrying) return;
    setRetrying("counts");
    try {
      const response = await fetch(`/api/songs/${song.id}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { song: DashboardSong & { counts: DashboardCounts } };
      const { counts: nextCounts, ...nextSong } = result.song;
      setSong((current) => ({ ...current, ...nextSong }));
      setCounts(nextCounts);
    } catch { setCounts(null); }
    finally { setRetrying(null); }
  }

  async function retryLyrics() {
    if (retrying) return;
    setRetrying("lyrics");
    try {
      const response = await fetch(`/api/songs/${song.id}/lyrics`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: LyricRecord[] };
      setLyrics(sortLyrics(result.items));
      setLyricsError(false);
    } catch { setLyricsError(true); }
    finally { setRetrying(null); }
  }

  async function retryLinked(kind: "rhymes" | "prompts") {
    if (retrying) return;
    setRetrying(kind);
    const endpoint = kind === "rhymes"
      ? `/api/rhymes?song=${song.id}&sort=updated_desc&limit=3`
      : `/api/prompts?song=${song.id}&sort=updated_desc&limit=3`;
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: RhymePreview[] | PromptPreview[] };
      if (kind === "rhymes") setRhymes(result.items as RhymePreview[]);
      else setPrompts(result.items as PromptPreview[]);
    } catch {
      if (kind === "rhymes") setRhymes(null);
      else setPrompts(null);
    } finally { setRetrying(null); }
  }

  function editNote(target: NoteTarget) {
    setNoteTarget(target);
    setNoteValue(target.value);
  }

  async function writeNote(target: NoteTarget, value: string, closeEditor = true) {
    if (noteSaving) return;
    setNoteSaving(true);
    setNotice("");
    try {
      if (target.kind === "song") {
        const response = await fetch(`/api/songs/${song.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workNotes: value })
        });
        if (!response.ok) throw new Error();
        const result = await response.json() as { song: DashboardSong };
        setSong((current) => ({ ...current, ...result.song }));
      } else {
        const response = await fetch(`/api/lyrics/${target.lyric.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowVersion: target.lyric.rowVersion, memo: value })
        });
        if (!response.ok) throw new Error();
        const result = await response.json() as { lyric: LyricRecord };
        setLyrics((current) => sortLyrics(current.map((item) => item.id === result.lyric.id ? result.lyric : item)));
      }
      if (closeEditor) setNoteTarget(null);
      setNotice(value ? `${target.title} 메모를 저장했습니다.` : `${target.title} 메모를 삭제했습니다.`);
    } catch {
      setNotice("작업 메모를 저장하지 못했습니다. 최신 내용을 확인한 뒤 다시 시도해 주세요.");
    } finally { setNoteSaving(false); }
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
      router.push(`/lyrics/${result.lyric.id}${lyricReturnSuffix}`);
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
      router.push(`/lyrics/${result.lyric.id}${lyricReturnSuffix}`);
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
      setCounts((current) => current ? { ...current, lyrics: { value: Math.max(0, current.lyrics.value - 1), available: true } } : current);
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
        <div className="dashboard-refresh-row"><button type="button" disabled={Boolean(retrying)} onClick={retryCounts}>{retrying === "counts" ? "자료 수 확인 중…" : "자료 수 새로 고침"}</button></div>
        <section className="count-grid" aria-label="곡 자료 요약">
          {counts ? <><Count label="가사 버전" value={counts.lyrics.value} /><Count label="연결 프롬프트" value={counts.prompts.value} /><Count label="라임 노트" value={counts.rhymes.value} /></>
            : <div className="dashboard-section-error count-error" role="alert"><strong>자료 수를 불러오지 못했습니다.</strong><button type="button" disabled={retrying === "counts"} onClick={retryCounts}>{retrying === "counts" ? "확인 중…" : "다시 시도"}</button></div>}
        </section>
        <section className={`dashboard-panel lyrics-panel${lyrics.length ? "" : " is-empty"}`} aria-labelledby="lyrics-heading">
          <div className="lyrics-panel-heading"><div><p className="eyebrow">Lyrics</p><h2 id="lyrics-heading">가사 작업 공간</h2></div><div><button className="secondary-button" type="button" disabled={Boolean(retrying)} onClick={retryLyrics}>{retrying === "lyrics" ? "확인 중…" : "목록 새로 고침"}</button><button className="primary-button" type="button" disabled={creating} onClick={createLyric}>{creating ? "만드는 중…" : "＋ 새 가사"}</button></div></div>
          {lyricsError ? <SectionError message="가사 버전을 불러오지 못했습니다. 곡 정보와 다른 영역은 계속 사용할 수 있습니다." busy={retrying === "lyrics"} onRetry={retryLyrics} />
            : lyrics.length === 0 ? <div className="lyrics-empty-copy"><span className="empty-icon" aria-hidden="true">≋</span><h3>첫 가사를 시작해보세요</h3><p>새 가사를 만들면 이 곡에 연결된 편집기로 바로 이동합니다.</p><button className="secondary-button" type="button" disabled={creating} onClick={createLyric}>첫 가사 작성</button></div>
              : <div className="lyric-card-list">{lyrics.map((lyric, index) => <LyricCard key={lyric.id} lyric={lyric} href={`/lyrics/${lyric.id}${lyricReturnSuffix}`} current={index === 0} busy={busyLyricId === lyric.id} onFavorite={toggleLyricFavorite} onDuplicate={duplicateLyric} onMemo={(value) => editNote({ kind: "lyric", lyric, title: lyric.title, value })} onDelete={setLyricDeleteTarget} />)}</div>}
        </section>
      </main>
      <aside className="dashboard-side">
        <section className="dashboard-panel notes-panel"><div className="panel-title-row"><div><p className="eyebrow">Work notes</p><h2>작업 메모</h2></div><button type="button" onClick={() => editNote({ kind: "song", title: song.title, value: song.workNotes })}>{song.workNotes ? "곡 메모 편집" : "＋ 곡 메모"}</button></div>
          {!song.workNotes && !lyrics.some((lyric) => lyric.memo) ? <p className="muted-copy">아직 작업 메모가 없습니다. 곡이나 가사에 다음 할 일을 남겨보세요.</p> : <div className="work-note-list">
            {song.workNotes ? <WorkNote label="곡" title={song.title} value={song.workNotes} onEdit={() => editNote({ kind: "song", title: song.title, value: song.workNotes })} onDelete={() => void writeNote({ kind: "song", title: song.title, value: song.workNotes }, "", false)} /> : null}
            {lyrics.filter((lyric) => lyric.memo).map((lyric) => <WorkNote key={lyric.id} label="가사" title={lyric.title} value={lyric.memo} onEdit={() => editNote({ kind: "lyric", lyric, title: lyric.title, value: lyric.memo })} onDelete={() => void writeNote({ kind: "lyric", lyric, title: lyric.title, value: lyric.memo }, "", false)} />)}
          </div>}
        </section>
        <LinkedResources songId={song.id} rhymes={rhymes} prompts={prompts} retrying={retrying} onRetry={retryLinked} />
        <section className="danger-zone"><h2>곡 관리</h2><p>삭제한 곡은 목록에서 숨겨집니다.</p><button type="button" onClick={() => setDeleteOpen(true)}>곡 삭제</button></section>
      </aside>
    </div>

    {lyricDeleteTarget ? <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="lyric-delete-title" aria-describedby="lyric-delete-description"><p className="eyebrow">Soft delete</p><h2 id="lyric-delete-title">‘{lyricDeleteTarget.title}’ 가사를 삭제할까요?</h2><p id="lyric-delete-description">이 가사를 목록과 검색에서 숨깁니다. 같은 곡의 다른 가사는 유지됩니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={Boolean(busyLyricId)} onClick={() => setLyricDeleteTarget(null)}>취소</button><button className="danger-button" type="button" disabled={Boolean(busyLyricId)} onClick={deleteLyric}>{busyLyricId ? "삭제 중…" : "가사 삭제 확인"}</button></div></div></div> : null}
    {noteTarget ? <div className="dialog-backdrop" role="presentation"><div className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-title"><p className="eyebrow">본문과 분리해 저장</p><h2 id="note-title">{noteTarget.title} 작업 메모</h2><label><span>메모 내용</span><textarea autoFocus maxLength={10_000} value={noteValue} onChange={(event) => setNoteValue(event.target.value)} placeholder="다음 수정 방향이나 확인할 일을 기록하세요." /></label><small>{noteValue.length.toLocaleString("ko-KR")} / 10,000자</small><div><button className="secondary-button" type="button" disabled={noteSaving} onClick={() => setNoteTarget(null)}>취소</button><button className="primary-button" type="button" disabled={noteSaving} onClick={() => void writeNote(noteTarget, noteValue)}>{noteSaving ? "저장 중…" : "메모 저장"}</button></div></div></div> : null}
    {deleteOpen ? <div className="dialog-backdrop" role="presentation"><div className="delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><p className="eyebrow">Soft delete</p><h2 id="delete-title">‘{song.title}’ 곡을 삭제할까요?</h2><p id="delete-description">목록에서 이 곡을 숨기며 현재 활성 가사도 함께 숨겨집니다. 연결된 독립 자료는 삭제되지 않습니다.</p><div><button autoFocus className="secondary-button" type="button" disabled={deleting} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-button" type="button" disabled={deleting} onClick={deleteSong}>{deleting ? "삭제 중…" : "곡 삭제 확인"}</button></div></div></div> : null}
  </section>;
}

function LyricCard({ lyric, href, current, busy, onFavorite, onDuplicate, onMemo, onDelete }: {
  lyric: LyricRecord;
  href: string;
  current: boolean;
  busy: boolean;
  onFavorite: (lyric: LyricRecord) => void;
  onDuplicate: (lyric: LyricRecord) => void;
  onMemo: (value: string) => void;
  onDelete: (lyric: LyricRecord) => void;
}) {
  const preview = lyric.body.trim().split("\n").filter(Boolean).slice(0, 3).join(" · ");
  return <article className={`lyric-card${lyric.isPinned ? " is-pinned" : ""}`}>
    <div className="lyric-card-copy"><div><span className={`lyric-status status-${lyric.status}`}>{LYRIC_STATUS_LABELS[lyric.status]}</span>{current ? <span className="current-label">현재 작업</span> : null}{lyric.isPinned ? <span className="pinned-label">고정</span> : null}</div><h3><a href={href}>{lyric.title}</a></h3><p className={preview ? "" : "is-empty"}>{preview || "아직 가사 본문이 없습니다."}</p>{lyric.memo ? <p className="lyric-memo-preview">메모 · {lyric.memo}</p> : null}<time dateTime={lyric.updatedAt}>{formatDate(lyric.updatedAt)}</time></div>
    <div className="lyric-card-actions"><button type="button" disabled={busy} aria-pressed={lyric.isFavorite} aria-label={`${lyric.title} ${lyric.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}`} onClick={() => onFavorite(lyric)}>★</button><a href={href}>열기</a><button type="button" disabled={busy} onClick={() => onMemo(lyric.memo)}>{lyric.memo ? "메모 편집" : "메모 추가"}</button><button type="button" disabled={busy} onClick={() => onDuplicate(lyric)}>복제</button><button type="button" disabled={busy} className="danger-text" onClick={() => onDelete(lyric)}>삭제</button></div>
  </article>;
}

function Count({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value}</strong><small>삭제되지 않은 현재 자료</small></article>;
}

function SectionError({ message, busy, onRetry }: { message: string; busy: boolean; onRetry: () => void }) {
  return <div className="dashboard-section-error" role="alert"><strong>{message}</strong><button className="secondary-button" type="button" disabled={busy} onClick={onRetry}>{busy ? "다시 불러오는 중…" : "다시 시도"}</button></div>;
}

function WorkNote({ label, title, value, onEdit, onDelete }: {
  label: string; title: string; value: string; onEdit: () => void; onDelete: () => void;
}) {
  return <article className="work-note"><header><span>{label}</span><strong>{title}</strong></header><p>{value}</p><div><button type="button" onClick={onEdit}>편집</button><button className="danger-text" type="button" onClick={onDelete}>삭제</button></div></article>;
}

function LinkedResources({ songId, rhymes, prompts, retrying, onRetry }: {
  songId: string;
  rhymes: readonly RhymePreview[] | null;
  prompts: readonly PromptPreview[] | null;
  retrying: "counts" | "lyrics" | "rhymes" | "prompts" | null;
  onRetry: (kind: "rhymes" | "prompts") => void;
}) {
  const empty = rhymes?.length === 0 && prompts?.length === 0;
  return <section className={`dashboard-panel linked-panel${empty ? " linked-empty" : ""}`}><p className="eyebrow">Linked resources</p><h2>연결 자료</h2>
    <section aria-labelledby="linked-rhymes-title"><div className="linked-section-heading"><h3 id="linked-rhymes-title">라임 노트</h3><span><button type="button" disabled={Boolean(retrying)} onClick={() => onRetry("rhymes")}>{retrying === "rhymes" ? "확인 중…" : "새로 고침"}</button><a href={`/rhymes?song=${songId}`}>전체 보기</a></span></div>
      {rhymes === null ? <SectionError message="연결 라임을 불러오지 못했습니다." busy={retrying === "rhymes"} onRetry={() => onRetry("rhymes")} />
        : rhymes.length ? <div className="linked-preview-list">{rhymes.map((rhyme) => <a key={rhyme.id} href={`/rhymes/${rhyme.id}`}><strong>{rhyme.title}</strong><span>{previewText(rhyme.body) || "아직 본문이 없습니다."}</span></a>)}</div>
          : <p className="linked-none">연결된 라임 노트가 없습니다.</p>}
    </section>
    <section aria-labelledby="linked-prompts-title"><div className="linked-section-heading"><h3 id="linked-prompts-title">프롬프트</h3><span><button type="button" disabled={Boolean(retrying)} onClick={() => onRetry("prompts")}>{retrying === "prompts" ? "확인 중…" : "새로 고침"}</button><a href={`/prompts?song=${songId}`}>전체 보기</a></span></div>
      {prompts === null ? <SectionError message="연결 프롬프트를 불러오지 못했습니다." busy={retrying === "prompts"} onRetry={() => onRetry("prompts")} />
        : prompts.length ? <div className="linked-preview-list">{prompts.map((prompt) => <a key={prompt.id} href={`/prompts/${prompt.id}`}><strong>{prompt.title}</strong><span>{previewText(prompt.plainText) || "아직 토큰이 없습니다."}</span></a>)}</div>
          : <p className="linked-none">연결된 프롬프트가 없습니다.</p>}
    </section>
    {empty ? <p className="linked-guidance">각 자료 편집기에서 이 곡을 연결하면 여기에 바로 표시됩니다.</p> : null}
  </section>;
}

function sortLyrics(values: readonly LyricRecord[]) {
  return [...values].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function previewText(value: string) {
  return value.trim().split(/\s*\n\s*/u).filter(Boolean).slice(0, 2).join(" · ").slice(0, 180);
}

function colorLabel(color: ResourceColor) {
  return ({ red: "빨강", yellow: "노랑", green: "초록", blue: "파랑", gray: "회색" } as const)[color];
}
