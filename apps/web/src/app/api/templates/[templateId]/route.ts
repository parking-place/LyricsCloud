import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";
import { templateApiError, templateResponseHeaders } from "../../../../lib/template-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ templateId: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request); const { templateId } = await context.params;
    if (!isResourceId(templateId)) return errorResponse("NOT_FOUND", 404);
    const template = await getAuthContext().templates.getTemplate(auth.userId, templateId);
    return template ? Response.json({ template }, { headers: templateResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return templateApiError(error); }
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { templateId } = await context.params;
    if (!isResourceId(templateId)) return errorResponse("NOT_FOUND", 404);
    const template = await getAuthContext().templates.updateTemplate(auth.userId, templateId, await request.json());
    return template ? Response.json({ template }, { headers: templateResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return templateApiError(error); }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request); const { templateId } = await context.params;
    if (!isResourceId(templateId) || !await getAuthContext().templates.deleteTemplate(auth.userId, templateId)) return errorResponse("NOT_FOUND", 404);
    return new Response(null, { status: 204, headers: templateResponseHeaders(auth.renewalCookie) });
  } catch (error) { return templateApiError(error); }
}
