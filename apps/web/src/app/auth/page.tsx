import { redirect } from "next/navigation";
import { AuthScreen } from "../../components/auth-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; requestId?: string }> }) {
  if (await resolvePageUser()) redirect("/workspace");
  const query = await searchParams;
  return <AuthScreen errorCode={query.error} requestId={query.requestId} />;
}
