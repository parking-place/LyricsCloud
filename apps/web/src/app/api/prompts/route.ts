import { parsePromptListInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { promptApiError, promptResponseHeaders } from "../../../lib/prompt-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const result = await getAuthContext().prompts.listPrompts(auth.userId, parsePromptListInput(new URL(request.url).searchParams));
    return Response.json(result, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}
