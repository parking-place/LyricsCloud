import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { sharingApiError, sharingResponseHeaders } from "../../../../lib/sharing-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const identity = await getAuthContext().lyricSharing.getOwnIdentity(auth.userId);
    return identity
      ? Response.json({ identity }, { headers: sharingResponseHeaders(auth.renewalCookie) })
      : errorResponse("NOT_FOUND", 404);
  } catch (error) { return sharingApiError(error); }
}
