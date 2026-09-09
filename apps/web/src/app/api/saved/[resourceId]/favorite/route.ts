import { parseSavedToggle } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { savedApiError, savedResponseHeaders } from "../../../../../lib/saved-resource-api.js";

export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function PUT(request: Request, { params }: { params: Promise<{ resourceId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { resourceId } = await params;
    const resource = await getAuthContext().savedResources.setFavorite(auth.userId, resourceId, parseSavedToggle(await request.json()));
    return resource ? Response.json({ resource }, { headers: savedResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return savedApiError(error); }
}
