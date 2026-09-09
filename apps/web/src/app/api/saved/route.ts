import { parseSavedResourceQuery } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { savedApiError, savedResponseHeaders } from "../../../lib/saved-resource-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const items = await getAuthContext().savedResources.list(auth.userId, parseSavedResourceQuery(new URL(request.url).searchParams));
    return Response.json({ items }, { headers: savedResponseHeaders(auth.renewalCookie) });
  } catch (error) { return savedApiError(error); }
}
