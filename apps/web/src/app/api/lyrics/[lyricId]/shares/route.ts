import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { parseShareGrantInput, sharingApiError, sharingResponseHeaders } from "../../../../../lib/sharing-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    const items = await getAuthContext().lyricSharing.listGrants(auth.userId, lyricId);
    return items ? Response.json({ items }, { headers: sharingResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return sharingApiError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ lyricId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    const input = parseShareGrantInput(await request.json());
    const result = await getAuthContext().lyricSharing.grantRead(auth.userId, lyricId, input.sharingId, input.requestId, input.expiresAt);
    return result ? Response.json(result, { status: result.replayed ? 200 : 201,
      headers: sharingResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return sharingApiError(error); }
}
