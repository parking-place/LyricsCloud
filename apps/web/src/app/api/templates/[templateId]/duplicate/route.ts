import { isResourceId, parseTemplateRequestId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";
import { templateApiError, templateResponseHeaders } from "../../../../../lib/template-api.js";

export const dynamic = "force-dynamic"; export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { templateId } = await params;
    if (!isResourceId(templateId)) return errorResponse("NOT_FOUND", 404);
    const result = await getAuthContext().templates.duplicateTemplate(auth.userId, templateId, parseTemplateRequestId(await request.json()));
    return result ? Response.json(result, { status: result.replayed ? 200 : 201, headers: templateResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return templateApiError(error); }
}
