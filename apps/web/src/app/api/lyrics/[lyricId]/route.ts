import { isResourceId, parseUpdateLyricInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { lyricApiError } from "../../../../lib/lyric-api.js";
import { mutationOriginAllowed, songResponseHeaders } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ lyricId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const lyric = await getAuthContext().lyrics.getLyric(auth.userId, lyricId);
    return lyric ? Response.json({ lyric }, { headers: songResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return lyricApiError(error); }
}
export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const lyric = await getAuthContext().lyrics.updateLyricCurrent(auth.userId, lyricId, parseUpdateLyricInput(await request.json()));
    return lyric ? Response.json({ lyric }, { headers: songResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return lyricApiError(error); }
}
export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await context.params;
    const deleted = isResourceId(lyricId) && await getAuthContext().lyrics.deleteLyric(auth.userId, lyricId);
    return Response.json({ deleted }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return lyricApiError(error); }
}
