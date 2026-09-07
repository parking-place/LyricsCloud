import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { LyricEditor } from "../../../components/lyric-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeWorkspaceReturnTo } from "../../../lib/workspace-return.js";
import { normalizeSearchText } from "@lyricscloud/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LyricEditorPage({ params, searchParams }: {
  params: Promise<{ lyricId: string }>;
  searchParams: Promise<{ returnTo?: string; find?: string }>;
}) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { lyricId } = await params;
  const query = await searchParams;
  const lyric = await getAuthContext().lyrics.getLyric(user.userId, lyricId).catch(() => null);
  if (!lyric) notFound();
  const song = await getAuthContext().songs.getSong(user.userId, lyric.songId).catch(() => null);
  if (!song) notFound();
  const lyrics = await getAuthContext().lyrics.listSongLyrics(user.userId, lyric.songId).catch(() => null);
  if (!lyrics) notFound();
  const [initialPosition] = await Promise.all([
    getAuthContext().recentWork.getLyricPosition(user.userId, lyric.id).catch(() => null),
    getAuthContext().recentWork.recordOpen(user.userId, lyric.id).catch(() => false)
  ]);
  const returnTo = safeWorkspaceReturnTo(query.returnTo);
  const initialFind = normalizeSearchText((query.find ?? "").slice(0, 200));
  const dashboardHref = `/songs/${lyric.songId}?returnTo=${encodeURIComponent(returnTo)}`;
  return <WorkspaceShell profile={user} active="songs" currentSongId={song.id}><LyricEditor key={lyric.id} ownerId={user.userId} initialLyric={lyric} songTitle={song.title} songLyrics={lyrics} dashboardHref={dashboardHref} returnTo={returnTo} initialFind={initialFind} initialPosition={initialPosition} /></WorkspaceShell>;
}
