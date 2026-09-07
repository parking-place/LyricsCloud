import { cookies } from "next/headers";
import type { ThemePreference } from "@lyricscloud/domain";
import { getAuthContext } from "./auth-context.js";

export async function resolvePageUser(): Promise<{ userId: string; displayName: string; avatarUrl: string | null } | null> {
  const jar = await cookies();
  const token = jar.get("__Host-lc_session")?.value ?? jar.get("lc_session")?.value;
  if (!token) return null;
  try {
    const context = getAuthContext();
    const session = await context.service.resolveSession(token);
    const profile = await context.ownedData.getProfile(session.userId);
    if (!profile) return null;
    return { userId: session.userId, displayName: profile.displayName || "사용자", avatarUrl: profile.avatarUrl };
  } catch { return null; }
}

export async function resolvePageThemePreference(): Promise<ThemePreference> {
  const user = await resolvePageUser();
  if (!user) return "system";
  try { return (await getAuthContext().displaySettings.getUserSettings(user.userId)).theme; }
  catch { return "system"; }
}
