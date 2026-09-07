import { isResourceId, parseFavoriteInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { templateApiError, templateResponseHeaders } from "../../../../../lib/template-api.js";

export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function PUT(request: Request, { params }: { params: Promise<{ templateId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { templateId } = await params;
    if (!isResourceId(templateId)) return errorResponse("NOT_FOUND", 404);
    const template = await getAuthContext().templates.setFavorite(auth.userId, templateId, parseFavoriteInput(await request.json()));
    return template ? Response.json({ template }, { headers: templateResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return templateApiError(error); }
}
