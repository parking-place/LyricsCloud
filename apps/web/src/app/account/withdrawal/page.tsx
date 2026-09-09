import { redirect } from "next/navigation";
import { WithdrawalScreen } from "../../../components/withdrawal-screen.js";
import { resolvePendingWithdrawalPageSession } from "../../../lib/page-auth.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WithdrawalPage() {
  const session = await resolvePendingWithdrawalPageSession();
  if (!session) redirect("/auth");
  return <WithdrawalScreen displayName={session.displayName} purgeAt={session.purgeAt.toISOString()} />;
}
