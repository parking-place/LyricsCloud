import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { PromptListScreen, type PromptListQuery } from "../../components/prompt-list-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PromptsPage({ searchParams }: { searchParams: Promise<{ auth?: string; search?: string; song?: string; favorite?: string; recent?: string; sort?: string }> }) {
  const user = await resolvePageUser(); if (!user) redirect("/auth");
  const query = await searchParams;
  const sorts = ["favorite_first", "recent_used", "updated_desc", "created_desc", "created_asc", "title_asc"];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const initialQuery: PromptListQuery = {
    search: (query.search ?? "").normalize("NFC").slice(0, 200),
    song: uuid.test(query.song ?? "") ? query.song! : "", favorite: query.favorite === "true", recent: query.recent === "true",
    sort: sorts.includes(query.sort ?? "") ? query.sort as PromptListQuery["sort"] : "favorite_first"
  };
  return <WorkspaceShell profile={user} active="prompts" loginCompleted={query.auth === "success"}><PromptListScreen initialQuery={initialQuery} /></WorkspaceShell>;
}
