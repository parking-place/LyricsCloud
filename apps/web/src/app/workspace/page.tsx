import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const user = await resolvePageUser();
  if (!user) redirect("/auth");
  const query = await searchParams;
  return <AppShell profile={{ userId: user.userId, displayName: user.displayName, avatarUrl: user.avatarUrl }} loginCompleted={query.auth === "success"} />;
}
