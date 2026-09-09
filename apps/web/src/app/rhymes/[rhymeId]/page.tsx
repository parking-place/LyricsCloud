import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { RhymeEditor } from "../../../components/rhyme-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeWorkspaceReturnTo } from "../../../lib/workspace-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RhymeEditorPage({ params, searchParams }: { params: Promise<{ rhymeId: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { rhymeId } = await params;
  const query = await searchParams;
  const rhyme = await getAuthContext().rhymes.getRhymeNote(user.userId, rhymeId).catch(() => null);
  if (!rhyme) notFound();
  await getAuthContext().recentWork.recordOpen(user.userId, rhyme.id).catch(() => false);
  return <WorkspaceShell profile={user} active="rhymes"><RhymeEditor key={rhyme.id} ownerId={user.userId} initialRhyme={rhyme} returnTo={safeWorkspaceReturnTo(query.returnTo, "/rhymes")} /></WorkspaceShell>;
}
