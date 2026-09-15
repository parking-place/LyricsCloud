import { getAuthContext, resolveNativeRequestAuth } from "../../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request); const { lyricId } = await params;
    const lyric = await getAuthContext().lyricSharing.getSharedLyric(auth.userId, lyricId);
    return lyric ? Response.json({ lyric }, { headers: nativeResponseHeaders })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
