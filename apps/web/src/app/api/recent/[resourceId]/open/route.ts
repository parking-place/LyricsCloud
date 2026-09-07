import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { recentWorkApiError, recentWorkResponseHeaders } from "../../../../../lib/recent-work-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ resourceId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { resourceId } = await context.params;
    if (!await getAuthContext().recentWork.recordOpen(auth.userId, resourceId)) return errorResponse("NOT_FOUND", 404);
    return new Response(null, { status: 204, headers: recentWorkResponseHeaders(auth.renewalCookie) });
  } catch (error) { return recentWorkApiError(error); }
}
