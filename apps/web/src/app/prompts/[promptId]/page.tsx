import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { PromptEditor } from "../../../components/prompt-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PromptEditorPage({ params }: { params: Promise<{ promptId: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { promptId } = await params;
  const prompt = await getAuthContext().prompts.getPrompt(user.userId, promptId).catch(() => null);
  if (!prompt) notFound();
  return <WorkspaceShell profile={user} active="prompts"><PromptEditor key={prompt.id} ownerId={user.userId} initialPrompt={prompt} /></WorkspaceShell>;
}
