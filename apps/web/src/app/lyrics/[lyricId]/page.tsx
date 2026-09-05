import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { LyricEditor } from "../../../components/lyric-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LyricEditorPage({ params }: { params: Promise<{ lyricId: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { lyricId } = await params;
  const lyric = await getAuthContext().lyrics.getLyric(user.userId, lyricId).catch(() => null);
  if (!lyric) notFound();
  const song = await getAuthContext().songs.getSong(user.userId, lyric.songId).catch(() => null);
  if (!song) notFound();
  const lyrics = await getAuthContext().lyrics.listSongLyrics(user.userId, lyric.songId).catch(() => null);
  if (!lyrics) notFound();
  return <WorkspaceShell profile={user} active="songs"><LyricEditor key={lyric.id} ownerId={user.userId} initialLyric={lyric} songTitle={song.title} songLyrics={lyrics} /></WorkspaceShell>;
}
