import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { displaySettingsApiError, displaySettingsResponseHeaders } from "../../../lib/display-settings-api.js";
import { mutationOriginAllowed } from "../../../lib/song-api.js";
import { errorResponse } from "../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const settings = await getAuthContext().displaySettings.getUserSettings(auth.userId);
    return Response.json({ settings }, { headers: displaySettingsResponseHeaders(auth.renewalCookie) });
  } catch (error) { return displaySettingsApiError(error); }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const settings = await getAuthContext().displaySettings.updateUserSettings(auth.userId, await request.json());
    return Response.json({ settings }, { headers: displaySettingsResponseHeaders(auth.renewalCookie) });
  } catch (error) { return displaySettingsApiError(error); }
}
