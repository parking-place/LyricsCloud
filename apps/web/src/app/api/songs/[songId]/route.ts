import { parseUpdateSongInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { mutationOriginAllowed, songApiError, songResponseHeaders, validSongId } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Context { readonly params: Promise<{ songId: string }>; }

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { songId } = await context.params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const song = await getAuthContext().songs.getSong(auth.userId, songId);
    if (!song) return errorResponse("NOT_FOUND", 404);
    return Response.json({ song }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await context.params;
    if (!validSongId(songId)) return errorResponse("NOT_FOUND", 404);
    const input = parseUpdateSongInput(await request.json());
    const song = await getAuthContext().songs.updateSong(auth.userId, songId, input);
    if (!song) return errorResponse("NOT_FOUND", 404);
    return Response.json({ song }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { songId } = await context.params;
    if (!validSongId(songId)) return Response.json({ deleted: false }, { headers: songResponseHeaders(auth.renewalCookie) });
    const deleted = await getAuthContext().songs.deleteSong(auth.userId, songId);
    return Response.json({ deleted }, { headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) { return songApiError(error); }
}
