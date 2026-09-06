import { parseRhymeListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../lib/rhyme-api.js";

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
