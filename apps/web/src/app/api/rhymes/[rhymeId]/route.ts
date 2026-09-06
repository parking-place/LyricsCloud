import { isResourceId, parseUpdateRhymeNoteInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../lib/rhyme-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ rhymeId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await context.params;
    if (!isResourceId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const rhyme = await getAuthContext().rhymes.getRhymeNote(auth.userId, rhymeId);
    return rhyme ? Response.json({ rhyme }, { headers: rhymeResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return rhymeApiError(error); }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await context.params;
    if (!isResourceId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const rhyme = await getAuthContext().rhymes.updateRhymeNote(auth.userId, rhymeId, parseUpdateRhymeNoteInput(await request.json()));
    return rhyme ? Response.json({ rhyme }, { headers: rhymeResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return rhymeApiError(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await context.params;
    const deleted = isResourceId(rhymeId) && await getAuthContext().rhymes.deleteRhymeNote(auth.userId, rhymeId);
    return Response.json({ deleted }, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
