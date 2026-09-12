import { getAuthContext, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../../lib/http-response.js";
import { publicSharingApiError, publicSharingResponseHeaders } from "../../../../../../lib/public-sharing-api.js";
import { mutationOriginAllowed } from "../../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ lyricId: string; linkId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId, linkId } = await context.params;
    const changed = await getAuthContext().publicLyricSharing.revoke(auth.userId, lyricId, linkId);
    if (changed === null) return errorResponse("NOT_FOUND", 404);
    return Response.json({ revoked: changed }, { headers: { ...publicSharingResponseHeaders,
      ...(auth.renewalCookie ? { "Set-Cookie": auth.renewalCookie } : {}) } });
  } catch (error) { return publicSharingApiError(error); }
}
