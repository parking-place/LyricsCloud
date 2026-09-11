import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../../components/app-shell.js";
import { RhymeNewScreen } from "../../../components/rhyme-new-screen.js";
import { getAuthContext } from "../../../lib/auth-context.js";
import { resolvePageUser } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewRhymePage() {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const displaySettings = await getAuthContext().displaySettings.getUserSettings(user.userId);
  return <WorkspaceShell profile={user} active="rhymes"><RhymeNewScreen ownerId={user.userId} displaySettings={displaySettings} /></WorkspaceShell>;
}
