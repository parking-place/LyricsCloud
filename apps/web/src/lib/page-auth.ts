import { cookies } from "next/headers";
import { cookieNames, tokenHash } from "@lyricscloud/auth";
import type { ThemePreference } from "@lyricscloud/domain";
import type { PendingWithdrawalSession } from "@lyricscloud/database";
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

export async function resolvePendingWithdrawalPageSession(): Promise<PendingWithdrawalSession | null> {
  const jar = await cookies();
  const context = getAuthContext();
  const names = cookieNames(context.config);
  const token = jar.get(names.session)?.value;
  if (!token) return null;
  try { return await context.lifecycle.resolvePendingWithdrawalSession(tokenHash(token)); }
  catch { return null; }
}
