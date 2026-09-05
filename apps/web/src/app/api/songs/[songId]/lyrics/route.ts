import { isResourceId, parseCreateLyricInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { lyricApiError } from "../../../../../lib/lyric-api.js";
import { mutationOriginAllowed, songResponseHeaders } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ songId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { songId } = await context.params;
    if (!isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const items = await getAuthContext().lyrics.listSongLyrics(auth.userId, songId);
    return items ? Response.json({ items }, { headers: songResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return lyricApiError(error); }
}
export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await context.params;
    if (!isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().lyrics.createLyric(auth.userId, parseCreateLyricInput(await request.json(), songId));
    return result ? Response.json(result, { status: result.replayed ? 200 : 201, headers: songResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return lyricApiError(error); }
}
