import { parseSavedResourceQuery, type SavedResourceQuery } from "@lyricscloud/domain";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { FavoritesScreen } from "../../components/favorites-screen.js";
import { getAuthContext } from "../../lib/auth-context.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic"; export const revalidate = 0;
const DEFAULT_QUERY: SavedResourceQuery = { type: "all", scope: "all", status: "all" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await resolvePageUser(); if (!user) redirect("/auth");
  const raw = await searchParams; const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  let query: SavedResourceQuery;
  try { query = parseSavedResourceQuery(params); } catch { redirect("/favorites"); }
  const context = getAuthContext();
  const [items, songs] = await Promise.all([
    context.savedResources.list(user.userId, query).catch(() => null),
    context.savedResources.listSongs(user.userId).catch(() => [])
  ]);
  return <WorkspaceShell profile={user} active="favorites"><FavoritesScreen initialItems={items} songs={songs} query={query ?? DEFAULT_QUERY} /></WorkspaceShell>;
}
