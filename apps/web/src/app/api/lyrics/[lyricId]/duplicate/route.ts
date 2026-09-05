import { isResourceId, parseLyricRequestId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { lyricApiError } from "../../../../../lib/lyric-api.js";
import { mutationOriginAllowed, songResponseHeaders } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().lyrics.duplicateLyric(auth.userId, lyricId, { requestId: parseLyricRequestId(await request.json()) });
    return result ? Response.json(result, { status: result.replayed ? 200 : 201, headers: songResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return lyricApiError(error); }
}
