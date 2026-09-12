import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { sharingApiError, sharingResponseHeaders } from "../../../../../lib/sharing-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    const lyric = await getAuthContext().lyricSharing.getSharedLyric(auth.userId, lyricId);
    return lyric ? Response.json({ lyric }, { headers: sharingResponseHeaders(auth.renewalCookie) })
      : errorResponse("NOT_FOUND", 404);
  } catch (error) { return sharingApiError(error); }
}
