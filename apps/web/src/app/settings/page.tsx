import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { getAuthContext } from "../../lib/auth-context.js";
import { resolvePageUser } from "../../lib/page-auth.js";
import { SettingsScreen } from "../../components/settings-screen.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const settings = await getAuthContext().displaySettings.getUserSettings(user.userId);
  return <WorkspaceShell profile={user} active="settings"><SettingsScreen initialSettings={settings} ownerId={user.userId} /></WorkspaceShell>;
}
