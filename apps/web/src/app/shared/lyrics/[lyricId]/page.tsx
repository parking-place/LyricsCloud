import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../../components/app-shell.js";
import { SharedAccessUnavailable, SharedLyricViewer } from "../../../../components/shared-lyric-viewer.js";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { resolvePageUser } from "../../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SharedLyricPage({ params }: { params: Promise<{ lyricId: string }> }) {
  const { lyricId } = await params;
  const user = await resolvePageUser();
  if (!user) redirect(`/auth?returnTo=${encodeURIComponent(`/shared/lyrics/${lyricId}`)}`);
  const lyric = await getAuthContext().lyricSharing.getSharedLyric(user.userId, lyricId).catch(() => null);
  return <WorkspaceShell profile={user} active="home">{lyric ? <SharedLyricViewer initialLyric={lyric} /> : <SharedAccessUnavailable />}</WorkspaceShell>;
}
