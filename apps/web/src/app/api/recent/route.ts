import { parseRecentWorkQuery } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { recentWorkApiError, recentWorkResponseHeaders } from "../../../lib/recent-work-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const items = await getAuthContext().recentWork.listRecentWork(auth.userId, parseRecentWorkQuery(new URL(request.url).searchParams));
    return Response.json({ items }, { headers: recentWorkResponseHeaders(auth.renewalCookie) });
  } catch (error) { return recentWorkApiError(error); }
}
