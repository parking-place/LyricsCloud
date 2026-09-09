import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { searchApiError, searchResponseHeaders } from "../../../../../lib/search-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ recentId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { recentId } = await context.params;
    await getAuthContext().search.deleteRecentSearch(auth.userId, recentId);
    return new Response(null, { status: 204, headers: searchResponseHeaders(auth.renewalCookie) });
  } catch (error) { return searchApiError(error); }
}
