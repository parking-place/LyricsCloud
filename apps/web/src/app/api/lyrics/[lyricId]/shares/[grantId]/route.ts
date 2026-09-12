import { getAuthContext, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../../lib/song-api.js";
import { sharingApiError, sharingResponseHeaders } from "../../../../../../lib/sharing-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ lyricId: string; grantId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId, grantId } = await context.params;
    const revoked = await getAuthContext().lyricSharing.revokeRead(auth.userId, lyricId, grantId);
    return revoked === null ? errorResponse("NOT_FOUND", 404)
      : Response.json({ revoked }, { headers: sharingResponseHeaders(auth.renewalCookie) });
  } catch (error) { return sharingApiError(error); }
}
