import { isResourceId, parseRhymeSongSearchInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../lib/rhyme-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ rhymeId: string }> }): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await params;
    if (!isResourceId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const items = await getAuthContext().rhymes.listSongCandidates(auth.userId, rhymeId, parseRhymeSongSearchInput(new URL(request.url).searchParams));
    return items ? Response.json({ items }, { headers: rhymeResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return rhymeApiError(error); }
}
