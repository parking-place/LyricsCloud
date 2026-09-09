import { parseColorInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed, validSongId } from "../../../../../lib/song-api.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../lib/rhyme-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ rhymeId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await params;
    if (!validSongId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const rhyme = await getAuthContext().rhymes.setColor(auth.userId, rhymeId, parseColorInput(await request.json()));
    if (!rhyme) return errorResponse("NOT_FOUND", 404);
    return Response.json({ rhyme }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
