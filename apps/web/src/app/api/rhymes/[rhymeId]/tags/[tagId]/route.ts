import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../../lib/rhyme-api.js";
import { mutationOriginAllowed } from "../../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ rhymeId: string; tagId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId, tagId } = await params;
    if (!isResourceId(rhymeId) || !isResourceId(tagId)) return errorResponse("NOT_FOUND", 404);
    const rhyme = await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId);
    if (!rhyme) return errorResponse("NOT_FOUND", 404);
    const removed = await getAuthContext().rhymes.detachTag(auth.userId, rhymeId, tagId);
    return Response.json({ removed }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
