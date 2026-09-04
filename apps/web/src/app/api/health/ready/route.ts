import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase } from "@lyricscloud/database";

export async function GET() {
  try {
    const config = readRuntimeConfig(process.env);
    await checkDatabase(config.databaseUrl);
    return Response.json({ status: "ok", service: "web", check: "readiness" });
  } catch {
    return Response.json({ status: "unavailable", service: "web", check: "readiness" }, { status: 503 });
  }
}
