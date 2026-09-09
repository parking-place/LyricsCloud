import { parseCreatePromptInput, parsePromptListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { errorResponse } from "../../../lib/http-response.js";
import { promptApiError, promptResponseHeaders } from "../../../lib/prompt-api.js";
import { mutationOriginAllowed } from "../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const result = await getAuthContext().prompts.listPrompts(auth.userId, parsePromptListInput(new URL(request.url).searchParams));
    return Response.json(result, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const result = await getAuthContext().prompts.createPrompt(auth.userId, parseCreatePromptInput(await request.json()));
    return Response.json(result, { status: result.replayed ? 200 : 201, headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}
