import { parseUnifiedSearchInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { searchApiError, searchResponseHeaders } from "../../../lib/search-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const input = parseUnifiedSearchInput(new URL(request.url).searchParams);
    const result = await getAuthContext().search.search(auth.userId, input);
    return Response.json(result, { headers: searchResponseHeaders(auth.renewalCookie) });
  } catch (error) { return searchApiError(error); }
}
