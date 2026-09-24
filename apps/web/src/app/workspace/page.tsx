import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell.js";
import type { ChromaHomeData } from "../../components/chroma-home-screen.js";
import { readRuntimeConfig } from "@lyricscloud/config";
import { getAuthContext } from "../../lib/auth-context.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const chroma = readRuntimeConfig(process.env).uiVariant === "chroma";
  let homeData: ChromaHomeData | null = null;
  if (chroma) {
    const context = getAuthContext();
    const [songs, recent, saved] = await Promise.all([
      context.songs.listSongs(user.userId, { work: "all", sort: "updated_desc", limit: 3 }).catch(() => null),
      context.recentWork.listRecentWork(user.userId, { type: "all", limit: 12 }).catch(() => null),
      context.savedResources.list(user.userId, { type: "all", scope: "favorites", status: "all" }).catch(() => null)
    ]);
    homeData = {
      songs: songs?.items.map(({ id, title, description, status, lyricCount }) => ({ id, title, description, status, lyricCount })) ?? null,
      totalSongs: songs?.totalCount ?? null,
      recent,
      saved: saved?.slice(0, 2) ?? null
    };
  }
  return <AppShell profile={{ userId: user.userId, displayName: user.displayName, avatarUrl: user.avatarUrl }} loginCompleted={query.auth === "success"} homeData={homeData} />;
}
