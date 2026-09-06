import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { SongDashboard, type DashboardSong } from "../../../components/song-dashboard.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeSongReturnTo } from "../../../lib/song-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SongDashboardPage({
  params,
  searchParams
}: {
  params: Promise<{ songId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { songId } = await params;
  const query = await searchParams;
  const context = getAuthContext();
  const song = await context.songs.getSongSummary(user.userId, songId).catch(() => null);
  if (!song) notFound();
  const returnTo = safeSongReturnTo(query.returnTo);
  return <WorkspaceShell profile={user} active="songs"><Suspense fallback={<DashboardLoading />}><DashboardData ownerId={user.userId} song={song} returnTo={returnTo} /></Suspense></WorkspaceShell>;
}

async function DashboardData({ ownerId, song, returnTo }: { ownerId: string; song: DashboardSong; returnTo: string }) {
  const context = getAuthContext();
  const [countsResult, lyricsResult, rhymesResult, promptsResult] = await Promise.allSettled([
    context.songs.getSongDashboardCounts(ownerId, song.id),
    context.lyrics.listSongLyrics(ownerId, song.id),
    context.rhymes.listRhymeNotes(ownerId, { songId: song.id, sort: "updated_desc", limit: 3 }),
    context.prompts.listPrompts(ownerId, {
      songId: song.id, favoriteOnly: false, recentlyUsedOnly: false, sort: "updated_desc", limit: 3
    })
  ]);
  const counts = countsResult.status === "fulfilled" ? countsResult.value : null;
  const lyrics = lyricsResult.status === "fulfilled" ? lyricsResult.value : null;
  const rhymes = rhymesResult.status === "fulfilled" ? rhymesResult.value.items : null;
  const prompts = promptsResult.status === "fulfilled" ? promptsResult.value.items : null;
  return <SongDashboard
    initialSong={song}
    initialCounts={counts}
    initialLyrics={lyrics}
    initialRhymes={rhymes}
    initialPrompts={prompts}
    returnTo={returnTo}
  />;
}

function DashboardLoading() {
  return <main className="dashboard-page dashboard-loading" aria-label="곡 대시보드 불러오는 중" aria-busy="true">
    <header className="dashboard-heading skeleton-block"><div><span /><h1>곡 대시보드를 불러오는 중입니다.</h1><p /></div></header>
    <div className="dashboard-layout">
      <section className="dashboard-main"><div className="count-grid">{Array.from({ length: 3 }, (_, index) => <article className="skeleton-block" key={index} />)}</div><div className="dashboard-panel skeleton-block" /></section>
      <aside className="dashboard-side"><div className="dashboard-panel skeleton-block" /><div className="dashboard-panel skeleton-block" /></aside>
    </div>
  </main>;
}
