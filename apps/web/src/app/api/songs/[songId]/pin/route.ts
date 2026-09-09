import { parsePinInput } from "@lyricscloud/domain";
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
    const input = parsePinInput(await request.json());
    const song = await getAuthContext().songs.setPin(auth.userId, songId, input.isPinned, input.pinOrder);
    if (!song) return errorResponse("NOT_FOUND", 404);
    return Response.json({ song }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}
