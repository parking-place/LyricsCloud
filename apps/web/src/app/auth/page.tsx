import { redirect } from "next/navigation";
import { AuthScreen } from "../../components/auth-screen.js";
import { resolvePageUser } from "../../lib/page-auth.js";

export const dynamic = "force-dynamic";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; requestId?: string; flow?: string; returnTo?: string }> }) {
  const query = await searchParams;
  const returnTo = /^\/shared\/lyrics\/[0-9a-f-]{36}$/i.test(query.returnTo ?? "") ? query.returnTo! : "/workspace";
  if (await resolvePageUser()) redirect(returnTo);
  return <AuthScreen errorCode={query.error} requestId={query.requestId} flow={query.flow} returnTo={returnTo} />;
}
