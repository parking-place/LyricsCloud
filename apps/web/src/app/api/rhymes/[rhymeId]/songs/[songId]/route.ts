import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../../lib/rhyme-api.js";
import { mutationOriginAllowed } from "../../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ rhymeId: string; songId: string }> };

export async function PUT(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId, songId } = await params;
    if (!isResourceId(rhymeId) || !isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const [rhyme, song] = await Promise.all([
      getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId),
      getAuthContext().songs.getSong(auth.userId, songId)
    ]);
    if (!rhyme || !song) return errorResponse("NOT_FOUND", 404);
    await getAuthContext().rhymes.linkSong(auth.userId, rhymeId, songId);
    return Response.json({ linked: true }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}

export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId, songId } = await params;
    if (!isResourceId(rhymeId) || !isResourceId(songId)) return errorResponse("NOT_FOUND", 404);
    const rhyme = await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId);
    if (!rhyme) return errorResponse("NOT_FOUND", 404);
    const removed = await getAuthContext().rhymes.unlinkSong(auth.userId, rhymeId, songId);
    return Response.json({ removed }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
