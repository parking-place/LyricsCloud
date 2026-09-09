import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { SearchScreen } from "../../components/search-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";
import { SEARCH_RESOURCE_TYPES, type SearchTypeFilter } from "@lyricscloud/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const type = (["all", ...SEARCH_RESOURCE_TYPES] as readonly string[]).includes(query.type ?? "")
    ? query.type as SearchTypeFilter : "all";
  return <WorkspaceShell profile={user} active="search">
    <SearchScreen ownerId={user.userId} initialQuery={(query.q ?? "").slice(0, 200)} initialType={type} />
  </WorkspaceShell>;
}
