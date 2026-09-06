import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { RhymeEditor } from "../../../components/rhyme-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RhymeEditorPage({ params }: { params: Promise<{ rhymeId: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { rhymeId } = await params;
  const rhyme = await getAuthContext().rhymes.getRhymeNote(user.userId, rhymeId).catch(() => null);
  if (!rhyme) notFound();
  return <WorkspaceShell profile={user} active="rhymes"><RhymeEditor key={rhyme.id} ownerId={user.userId} initialRhyme={rhyme} /></WorkspaceShell>;
}
