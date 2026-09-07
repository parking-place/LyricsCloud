import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { PromptNewScreen } from "../../../components/prompt-new-screen.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewPromptPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const templateId = /^[0-9a-f-]{36}$/i.test(query.template ?? "") ? query.template : undefined;
  return <WorkspaceShell profile={user} active="prompts"><PromptNewScreen ownerId={user.userId} templateId={templateId} /></WorkspaceShell>;
}
