import { redirect } from "next/navigation";
import { resolvePageUser } from "../lib/page-auth.js";

export const dynamic = "force-dynamic";

export default async function Home() {
  redirect(await resolvePageUser() ? "/workspace" : "/auth");
}
