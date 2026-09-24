import { SONG_STATUS_LABELS, type RecentWorkItem, type SavedResourceItem, type SongStatus } from "@lyricscloud/domain";
import * as React from "react";

export interface ChromaHomeData {
  readonly songs: readonly { readonly id: string; readonly title: string; readonly description: string; readonly status: SongStatus; readonly lyricCount: number }[] | null;
  readonly totalSongs: number | null;
  readonly recent: readonly RecentWorkItem[] | null;
  readonly saved: readonly SavedResourceItem[] | null;
}

function resourceHref(item: Pick<RecentWorkItem | SavedResourceItem, "id" | "type">): string {
  const suffix = "?returnTo=%2Fworkspace";
  if (item.type === "song") return `/songs/${item.id}${suffix}`;
  if (item.type === "lyrics") return `/lyrics/${item.id}${suffix}`;
  if (item.type === "rhyme_note") return `/rhymes/${item.id}${suffix}`;
  return `/prompts/${item.id}${suffix}`;
}

function resourceLabel(type: RecentWorkItem["type"]): string {
  return { song: "곡", lyrics: "가사", rhyme_note: "라임 노트", prompt: "프롬프트" }[type];
}

export function ChromaHomeScreen({ displayName, data }: { displayName: string; data: ChromaHomeData }) {
  const resume = data.recent?.find((item) => item.type === "lyrics") ?? data.recent?.[0] ?? null;
  const fragment = data.recent?.find((item) => item.type === "rhyme_note") ?? null;
  const saved = data.saved?.slice(0, 2) ?? [];
  return <section className="chroma-home" aria-labelledby="workspace-title">
    <header className="chroma-home-intro">
      <div><p className="eyebrow">Your creative space</p><h1 tabIndex={-1} data-login-focus id="workspace-title">{displayName}님, 오늘은 어떤 이야기인가요?</h1><p>작은 영감에서 시작해도 좋아요. 나머지는 천천히.</p></div>
      <span className="chroma-home-context">나의 창작 공간 · 홈</span>
    </header>
    <div className="chroma-home-feature-grid">
      <article className="chroma-home-hero">
        <div className="chroma-home-hero-copy"><p className="eyebrow">A little spark, a new song</p><h2>생각을 모아,<br /><em>한 곡으로.</em></h2><p>마음에 맴도는 한 줄, 아직 이름 없는 멜로디.<br />흩어진 영감을 나만의 음악으로 이어 보세요.</p><div className="chroma-home-actions"><a className="primary-link" href="/songs/new">+ 새 곡 시작하기</a><a className="secondary-button" href="/rhymes/new?returnTo=%2Fworkspace">아이디어 담기 ↗</a></div></div>
        <div className="chroma-home-orbit" aria-hidden="true"><span /><span /><span /></div>
      </article>
      <article className="chroma-home-side-card">
        <header><h2>오늘의 조각</h2><a href="/rhymes">라임 노트 ↗</a></header>
        {data.recent === null ? <p className="chroma-home-state" role="status">최근 작업을 불러오지 못했습니다. 라임 노트에서 다시 확인해 주세요.</p>
          : fragment ? <><p className="chroma-home-fragment-title">{fragment.title}</p><p className="chroma-home-meta">최근 작업한 라임 노트</p><a className="chroma-home-card-link" href={resourceHref(fragment)} aria-label={`${fragment.title} 라임 노트 열기`}>↗</a></>
            : <><p className="chroma-home-state">최근 라임 노트가 없습니다. 떠오른 말을 첫 노트에 담아 보세요.</p><a className="chroma-home-card-link" href="/rhymes/new?returnTo=%2Fworkspace" aria-label="첫 라임 노트 작성">↗</a></>}
      </article>
      <article className="chroma-home-resume-card">
        <div><p className="eyebrow">Pick up where you left off</p><h2>{resume?.title ?? "새 작업을 시작해 볼까요?"}</h2><p>{data.recent === null ? "최근 작업을 불러오지 못했습니다. 최근 작업 화면에서 다시 확인해 주세요." : resume ? `${resourceLabel(resume.type)} · ${resume.activityKind === "opened" ? "최근 열람" : "최근 수정"}${resume.parentSong ? ` · ${resume.parentSong.title}` : ""}` : "아직 이어 쓸 작업이 없습니다. 첫 곡이나 가사를 만들 수 있어요."}</p><a className="primary-link" href={resume ? resourceHref(resume) : "/songs/new"}>{resume ? "이어서 작업하기 ↗" : "첫 곡 시작하기 ↗"}</a></div>
        <div className="chroma-home-resume-art" aria-hidden="true"><span>♪</span><span>···</span></div>
      </article>
      <article className="chroma-home-side-card chroma-home-saved">
        <header><h2>곁에 두는 자료</h2><a href="/favorites">모두 보기 ↗</a></header>
        {data.saved === null ? <p className="chroma-home-state" role="status">즐겨찾기를 불러오지 못했습니다. 즐겨찾기 화면에서 다시 확인해 주세요.</p>
          : saved.length ? <ul>{saved.map((item) => <li key={`${item.type}-${item.id}`}><span aria-hidden="true">{item.type === "prompt" ? "✧" : item.type === "rhyme_note" ? "≈" : "☆"}</span><div><a href={resourceHref(item)}>{item.title}</a><small>{resourceLabel(item.type)}{item.parentSong ? ` · ${item.parentSong.title}` : ""}</small></div></li>)}</ul>
            : <p className="chroma-home-state">즐겨찾기한 자료가 없습니다. 자주 쓰는 자료를 목록에서 저장해 두세요.</p>}
      </article>
    </div>
    <section className="chroma-home-songs" aria-labelledby="chroma-home-songs-title"><header><h2 id="chroma-home-songs-title">나의 곡 {data.totalSongs ?? ""}</h2><a href="/songs">작업 공간 둘러보기 ↗</a></header>
      {data.songs === null ? <p className="chroma-home-state" role="status">곡 목록을 불러오지 못했습니다. 곡 목록에서 다시 시도해 주세요.</p>
        : data.songs.length ? <div className="chroma-home-song-grid">{data.songs.map((song) => <article key={song.id}><span aria-hidden="true">✦</span><h3><a href={resourceHref({ type: "song", id: song.id })}>{song.title}</a></h3><p>{song.description || "설명이 없는 곡"}</p><small>{song.lyricCount}개 가사 · {SONG_STATUS_LABELS[song.status]}</small></article>)}</div>
          : <div className="chroma-home-state"><p>아직 곡이 없습니다. 첫 아이디어부터 시작해 보세요.</p><a className="primary-link" href="/songs/new">새 곡 만들기</a></div>}
    </section>
  </section>;
}
