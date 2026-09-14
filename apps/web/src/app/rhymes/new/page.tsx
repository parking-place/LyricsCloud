import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { RhymeNewScreen } from "../../../components/rhyme-new-screen.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";
import { safeWorkspaceReturnTo } from "../../../lib/workspace-return.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewRhymePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const returnTo = query.returnTo === undefined ? undefined : safeWorkspaceReturnTo(query.returnTo, "/rhymes");
  const displaySettings = await getAuthContext().displaySettings.getUserSettings(user.userId);
  return <WorkspaceShell profile={user} active="rhymes"><RhymeNewScreen ownerId={user.userId} displaySettings={displaySettings} returnTo={returnTo} /></WorkspaceShell>;
}
