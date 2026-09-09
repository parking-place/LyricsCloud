import { parseFavoriteInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed, songApiError, songResponseHeaders, validSongId } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ songId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const song = await getAuthContext().songs.setFavorite(auth.userId, songId, parseFavoriteInput(await request.json()));
    if (!song) return errorResponse("NOT_FOUND", 404);
    return Response.json({ song }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}
