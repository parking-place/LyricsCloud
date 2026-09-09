import { isResourceId, parseRhymeTagInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../lib/rhyme-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ rhymeId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await params;
    if (!isResourceId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const current = await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId);
    if (!current) return errorResponse("NOT_FOUND", 404);
    const tag = await getAuthContext().rhymes.upsertTag(auth.userId, parseRhymeTagInput(await request.json()));
    await getAuthContext().rhymes.attachTag(auth.userId, rhymeId, tag.id);
    const rhyme = await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId);
    return Response.json({ rhyme }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
