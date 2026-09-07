import { parseRecordRecentSearchInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { searchApiError, searchResponseHeaders } from "../../../../lib/search-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";
import { errorResponse } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const items = await getAuthContext().search.listRecentSearches(auth.userId);
    return Response.json({ items }, { headers: searchResponseHeaders(auth.renewalCookie) });
  } catch (error) { return searchApiError(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const item = await getAuthContext().search.recordRecentSearch(auth.userId, parseRecordRecentSearchInput(await request.json()));
    return Response.json({ item }, { status: 201, headers: searchResponseHeaders(auth.renewalCookie) });
  } catch (error) { return searchApiError(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    await getAuthContext().search.clearRecentSearches(auth.userId);
    return new Response(null, { status: 204, headers: searchResponseHeaders(auth.renewalCookie) });
  } catch (error) { return searchApiError(error); }
}
