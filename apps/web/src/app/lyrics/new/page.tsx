import { redirect } from "next/navigation";
import { LyricNewScreen } from "../../../components/lyric-new-screen.js";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeWorkspaceReturnTo } from "../../../lib/workspace-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewLyricPage({ searchParams }: { searchParams: Promise<{ songId?: string; returnTo?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const currentSongId = /^[0-9a-f-]{36}$/i.test(query.songId ?? "") ? query.songId : undefined;
  return <WorkspaceShell profile={user} active="songs" currentSongId={currentSongId}>
    <LyricNewScreen currentSongId={currentSongId} returnTo={safeWorkspaceReturnTo(query.returnTo)} />
  </WorkspaceShell>;
}
