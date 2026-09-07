import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { rhymeApiError, rhymeResponseHeaders } from "../../../../../lib/rhyme-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ rhymeId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { rhymeId } = await context.params;
    if (!isResourceId(rhymeId)) return errorResponse("NOT_FOUND", 404);
    const source = await getAuthContext().rhymeInsertions.getSource(auth.userId, rhymeId);
    return source
      ? Response.json({ source }, { headers: rhymeResponseHeaders(auth.renewalCookie) })
      : errorResponse("NOT_FOUND", 404);
  } catch (error) { return rhymeApiError(error); }
}
