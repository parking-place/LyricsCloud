import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { TrashScreen } from "../../components/trash-screen.js";
import { getAuthContext } from "../../lib/auth-context.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TrashPage() {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const context = getAuthContext();
  const [items, songs] = await Promise.all([context.lifecycle.listTrash(user.userId), context.savedResources.listSongs(user.userId)]);
  return <WorkspaceShell profile={user} active="trash"><TrashScreen initialItems={items} songs={songs} /></WorkspaceShell>;
}
