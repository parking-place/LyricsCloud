import { parseTemplateListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { mutationOriginAllowed } from "../../../lib/song-api.js";
import { errorResponse } from "../../../lib/http-response.js";
import { templateApiError, templateResponseHeaders } from "../../../lib/template-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const items = await getAuthContext().templates.listTemplates(auth.userId, parseTemplateListInput(new URL(request.url).searchParams));
    return Response.json({ items }, { headers: templateResponseHeaders(auth.renewalCookie) });
  } catch (error) { return templateApiError(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const result = await getAuthContext().templates.createTemplate(auth.userId, await request.json());
    return Response.json(result, { status: result.replayed ? 200 : 201, headers: templateResponseHeaders(auth.renewalCookie) });
  } catch (error) { return templateApiError(error); }
}
