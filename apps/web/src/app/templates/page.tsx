import { redirect } from "next/navigation";
import { WorkspaceShell } from "../../components/app-shell.js";
import { TemplateScreen } from "../../components/template-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic"; export const revalidate = 0;

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ type?: string; source?: string; sort?: string }> }) {
  const user = await resolvePageUser(); if (!user) redirect("/auth");
  const query = await searchParams;
  const type = query.type === "prompt" ? "prompt" : "lyrics";
  const source = ["default", "user"].includes(query.source ?? "") ? query.source as "default" | "user" : "all";
  const sort = ["recent_used", "updated_desc", "title_asc"].includes(query.sort ?? "") ? query.sort as "recent_used" | "updated_desc" | "title_asc" : "favorite_first";
  return <WorkspaceShell profile={user} active="templates"><TemplateScreen initialQuery={{ type, source, sort }} /></WorkspaceShell>;
}
