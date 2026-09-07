import { parsePinOrder } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { savedApiError, savedResponseHeaders } from "../../../../../lib/saved-resource-api.js";

export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function PUT(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const resources = await getAuthContext().savedResources.reorderPins(auth.userId, parsePinOrder(await request.json()));
    return resources ? Response.json({ resources }, { headers: savedResponseHeaders(auth.renewalCookie) }) : errorResponse("CONFLICT", 409);
  } catch (error) { return savedApiError(error); }
}
