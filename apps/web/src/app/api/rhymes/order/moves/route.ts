import { parseLibraryMoveInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../lib/rhyme-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseLibraryMoveInput(await request.json());
    const result = await getAuthContext().rhymes.moveRhymeNote(auth.userId, input);
    return Response.json(result, { headers: rhymeResponseHeaders(auth.renewalCookie) });
  } catch (error) { return rhymeApiError(error); }
}
