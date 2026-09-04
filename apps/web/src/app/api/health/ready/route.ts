import { readRuntimeConfig } from "@lyricscloud/config";
import { checkDatabase, DatabaseHealthError } from "@lyricscloud/database";
import { privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = readRuntimeConfig(process.env);
    const database = await checkDatabase(config.databaseUrl);
    return Response.json({
      status: "ok",
      service: "web",
      check: "readiness",
      build: { version: config.appVersion, id: config.buildId },
      database
    }, { headers: privateResponseHeaders });
  } catch (error) {
    const reason = error instanceof DatabaseHealthError ? error.code : "CONFIG_INVALID";
    return Response.json(
      { status: "unavailable", service: "web", check: "readiness", reason },
      { status: 503, headers: privateResponseHeaders }
    );
  }
}
