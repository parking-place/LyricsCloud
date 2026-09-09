import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { RhymeListScreen, type RhymeListQuery } from "../../components/rhyme-list-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RhymesPage({ searchParams }: { searchParams: Promise<{ auth?: string; search?: string; tag?: string; song?: string; sort?: string }> }) {
  const user = await resolvePageUser(); if (!user) redirect("/auth");
  const query = await searchParams;
  const sorts = ["updated_desc", "created_desc", "created_asc", "title_asc", "favorite_first"];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const initialQuery: RhymeListQuery = {
    search: (query.search ?? "").normalize("NFC").slice(0, 200),
    tag: uuid.test(query.tag ?? "") ? query.tag! : "", song: uuid.test(query.song ?? "") ? query.song! : "",
    sort: sorts.includes(query.sort ?? "") ? query.sort as RhymeListQuery["sort"] : "updated_desc"
  };
  return <WorkspaceShell profile={user} active="rhymes" loginCompleted={query.auth === "success"}><RhymeListScreen initialQuery={initialQuery} /></WorkspaceShell>;
}
