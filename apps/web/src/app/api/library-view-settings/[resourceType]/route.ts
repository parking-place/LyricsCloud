import { parseLibraryViewResourceType } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { libraryViewSettingsApiError, libraryViewSettingsResponseHeaders } from "../../../../lib/library-view-settings-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ resourceType: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const { resourceType } = await context.params;
    const setting = await getAuthContext().libraryViewSettings.get(auth.userId, parseLibraryViewResourceType(resourceType));
    return Response.json({ setting }, { headers: libraryViewSettingsResponseHeaders(auth.renewalCookie) });
  } catch (error) { return libraryViewSettingsApiError(error); }
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { resourceType } = await context.params;
    const setting = await getAuthContext().libraryViewSettings.update(auth.userId, parseLibraryViewResourceType(resourceType), await request.json());
    return Response.json({ setting }, { headers: libraryViewSettingsResponseHeaders(auth.renewalCookie) });
  } catch (error) { return libraryViewSettingsApiError(error); }
}
