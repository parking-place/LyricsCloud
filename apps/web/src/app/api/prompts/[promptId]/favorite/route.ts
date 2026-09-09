import { isResourceId, parseFavoriteInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { promptApiError, promptResponseHeaders } from "../../../../../lib/prompt-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ promptId: string }> }): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { promptId } = await params;
    if (!isResourceId(promptId)) return errorResponse("NOT_FOUND", 404);
    const prompt = await getAuthContext().prompts.setFavorite(auth.userId, promptId, parseFavoriteInput(await request.json()));
    return prompt ? Response.json({ prompt }, { headers: promptResponseHeaders(auth.renewalCookie) }) : errorResponse("NOT_FOUND", 404);
  } catch (error) { return promptApiError(error); }
}
