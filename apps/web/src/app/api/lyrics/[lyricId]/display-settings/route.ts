import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { displaySettingsApiError, displaySettingsResponseHeaders } from "../../../../../lib/display-settings-api.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ lyricId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const settings = await getAuthContext().displaySettings.getLyricDisplaySettings(auth.userId, lyricId);
    return settings ? Response.json({ settings }, { headers: displaySettingsResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return displaySettingsApiError(error); }
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const settings = await getAuthContext().displaySettings.updateLyricDisplaySettings(auth.userId, lyricId, await request.json());
    return settings ? Response.json({ settings }, { headers: displaySettingsResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return displaySettingsApiError(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const settings = await getAuthContext().displaySettings.resetLyricDisplaySettings(auth.userId, lyricId, await request.json());
    return settings ? Response.json({ settings }, { headers: displaySettingsResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return displaySettingsApiError(error); }
}
