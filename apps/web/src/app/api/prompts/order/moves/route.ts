import { parseLibraryMoveInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../../lib/auth-context.js";
import { errorResponse } from "../../../../../lib/http-response.js";
import { promptApiError, promptResponseHeaders } from "../../../../../lib/prompt-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseLibraryMoveInput(await request.json());
    const result = await getAuthContext().prompts.movePrompt(auth.userId, input);
    return Response.json(result, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}
