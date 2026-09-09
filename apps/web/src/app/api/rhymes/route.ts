import { parseCreateRhymeNoteInput, parseRhymeListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../lib/rhyme-api.js";
import { errorResponse } from "../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const input = parseRhymeListInput(new URL(request.url).searchParams);
    const result = await getAuthContext().rhymes.listRhymeNotes(auth.userId, input);
    return Response.json(result, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const created = await getAuthContext().rhymes.createRhymeNote(auth.userId, parseCreateRhymeNoteInput(await request.json()));
    return Response.json(created, { status: created.replayed ? 200 : 201, headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
