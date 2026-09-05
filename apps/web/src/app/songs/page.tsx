import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { SongListScreen, type SongListQuery } from "../../components/song-list-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SongsPage({
  searchParams
}: {
  searchParams: Promise<{ auth?: string; search?: string; status?: string; sort?: string }>;
}) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  const statuses = ["idea", "writing_lyrics", "revising", "suno_generating", "mixing", "completed", "on_hold"];
  const sorts = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"];
  const initialQuery: SongListQuery = {
    search: (query.search ?? "").slice(0, 200),
    status: statuses.includes(query.status ?? "") ? query.status as SongListQuery["status"] : "",
    sort: sorts.includes(query.sort ?? "") ? query.sort as SongListQuery["sort"] : "updated_desc"
  };
  return <WorkspaceShell profile={user} active="songs" loginCompleted={query.auth === "success"}>
    <SongListScreen initialQuery={initialQuery} />
  </WorkspaceShell>;
}
