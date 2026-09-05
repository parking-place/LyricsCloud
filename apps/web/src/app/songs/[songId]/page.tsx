import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { SongDashboard } from "../../../components/song-dashboard.js";
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
  const song = await getAuthContext().songs.getSong(user.userId, songId).catch(() => null);
  if (!song) notFound();
  const lyrics = await getAuthContext().lyrics.listSongLyrics(user.userId, songId).catch(() => null);
  if (!lyrics) notFound();
  return <WorkspaceShell profile={user} active="songs"><SongDashboard initialSong={song} initialLyrics={lyrics} returnTo={safeSongReturnTo(query.returnTo)} /></WorkspaceShell>;
}
