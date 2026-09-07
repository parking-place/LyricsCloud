import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { RecentWorkScreen } from "../../components/recent-work-screen.js";
import { getAuthContext } from "../../lib/auth-context.js";
import { resolvePageUser } from "../../lib/page-auth.js";
import type { RecentWorkTypeFilter } from "@lyricscloud/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RecentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const type = (["all", "song", "lyrics", "rhyme_note", "prompt"] as readonly string[]).includes(query.type ?? "")
    ? query.type as RecentWorkTypeFilter
    : "all";
  const items = await getAuthContext().recentWork.listRecentWork(user.userId, { type, limit: 50 }).catch(() => null);
  return <WorkspaceShell profile={user} active="recent">
    <RecentWorkScreen items={items} type={type} />
  </WorkspaceShell>;
}
