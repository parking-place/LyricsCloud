import { notFound, redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { PromptEditor } from "../../../components/prompt-editor.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeWorkspaceReturnTo } from "../../../lib/workspace-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PromptEditorPage({ params, searchParams }: { params: Promise<{ promptId: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const { promptId } = await params;
  const query = await searchParams;
  const prompt = await getAuthContext().prompts.getPrompt(user.userId, promptId).catch(() => null);
  if (!prompt) notFound();
  await getAuthContext().recentWork.recordOpen(user.userId, prompt.id).catch(() => false);
  return <WorkspaceShell profile={user} active="prompts"><PromptEditor key={prompt.id} ownerId={user.userId} initialPrompt={prompt} returnTo={safeWorkspaceReturnTo(query.returnTo, "/prompts")} /></WorkspaceShell>;
}
