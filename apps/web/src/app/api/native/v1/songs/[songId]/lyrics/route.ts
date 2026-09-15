import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveNativeRequestAuth } from "../../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ songId: string }> }): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request);
    const { songId } = await params;
    const items = isResourceId(songId) ? await getAuthContext().lyrics.listSongLyrics(auth.userId, songId) : null;
    return items ? Response.json({ items }, { headers: nativeResponseHeaders })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
