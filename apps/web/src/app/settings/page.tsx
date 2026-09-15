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
  const context = getAuthContext();
  const [settings, profile, googleEmail] = await Promise.all([
    context.displaySettings.getUserSettings(user.userId),
    context.ownedData.getProfile(user.userId),
    context.ownedData.getVerifiedGoogleEmail(user.userId)
  ]);
  if (!profile) redirect("/auth");
  return <WorkspaceShell profile={user} active="settings"><SettingsScreen initialSettings={settings}
    ownerId={user.userId} initialProfile={{ userId: profile.userId, displayName: profile.displayName,
      avatarUrl: profile.avatarUrl, rowVersion: profile.rowVersion,
      displayNameSource: profile.displayNameSource, avatarSource: profile.avatarSource }}
    googleEmail={googleEmail} /></WorkspaceShell>;
}
