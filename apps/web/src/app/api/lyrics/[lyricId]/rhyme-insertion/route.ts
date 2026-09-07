import { isResourceId, parseRhymeInsertionRequest, RhymeValidationError } from "@lyricscloud/domain";
import { getAuthContext, RequestAuthError, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { mutationOriginAllowed, songApiError, songResponseHeaders } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ lyricId: string }> };

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const { lyricId } = await context.params;
    if (!isResourceId(lyricId)) return errorResponse("NOT_FOUND", 404);
    const input = parseRhymeInsertionRequest(await request.json());
    if (input.target.resourceId !== lyricId) {
      return Response.json({ valid: false, reason: "target_changed" }, { status: 409, headers: songResponseHeaders(auth.renewalCookie) });
    }
    const result = await getAuthContext().rhymeInsertions.validate(auth.userId, input);
    return Response.json(result, { status: result.valid ? 200 : 409, headers: songResponseHeaders(auth.renewalCookie) });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RhymeValidationError) return errorResponse("VALIDATION_FAILED", 400);
    if (error instanceof RequestAuthError) return errorResponse("AUTH_REQUIRED", 401);
    return songApiError(error);
  }
}
