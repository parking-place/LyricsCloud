import { nativeResponseHeaders } from "../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  return Response.json({
    contract: "lyricscloud.native.read.v1",
    platform: "windows",
    authentication: { broker: "system-browser-loopback", pkceMethods: ["S256"], sessionScope: "read" },
    resources: ["songs", "lyrics", "rhyme_notes", "prompts", "selected_shared_lyrics", "song_links", "suno_workspace"],
    copyFixture: "lyricscloud.windows.contract.v1",
    writes: false,
    webView2: false
  }, { headers: nativeResponseHeaders });
}
