import { readRuntimeConfig } from "@lyricscloud/config";
import { privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";

export function GET() {
  const config = readRuntimeConfig(process.env);
  return Response.json({
    status: "ok",
    service: "web",
    check: "liveness",
    build: { version: config.appVersion, id: config.buildId }
  }, { headers: privateResponseHeaders });
}
