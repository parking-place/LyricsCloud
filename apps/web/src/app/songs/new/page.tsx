import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { SongForm } from "../../../components/song-form.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeSongReturnTo } from "../../../lib/song-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewSongPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  return <WorkspaceShell profile={user} active="songs"><SongForm returnTo={safeSongReturnTo(query.returnTo)} /></WorkspaceShell>;
}
