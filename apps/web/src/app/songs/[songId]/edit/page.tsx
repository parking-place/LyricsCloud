import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../../components/app-shell.js";
import { SongForm } from "../../../../components/song-form.js";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { resolvePageUser } from "../../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditSongPage({ params }: { params: Promise<{ songId: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { songId } = await params;
  const song = await getAuthContext().songs.getSong(user.userId, songId).catch(() => null);
  if (!song) notFound();
  return <WorkspaceShell profile={user} active="songs"><SongForm song={song} /></WorkspaceShell>;
}
