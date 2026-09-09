import { parseSaveLyricPositionInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { recentWorkApiError, recentWorkResponseHeaders } from "../../../../../lib/recent-work-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ resourceId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { resourceId } = await context.params;
    const position = await getAuthContext().recentWork.saveLyricPosition(
      auth.userId,
      resourceId,
      parseSaveLyricPositionInput(await request.json())
    );
    if (!position) return errorResponse("NOT_FOUND", 404);
    // This endpoint is flushed with keepalive during page shutdown. A delayed
    // response must not restore an old account's cookie after the user signs in
    // as someone else in the same browser context.
    return Response.json({ position }, { headers: recentWorkResponseHeaders() });
  } catch (error) { return recentWorkApiError(error); }
}
