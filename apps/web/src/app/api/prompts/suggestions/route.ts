import { parsePromptSuggestionInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { promptApiError, promptResponseHeaders } from "../../../../lib/prompt-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const input = parsePromptSuggestionInput(new URL(request.url).searchParams);
    const items = await getAuthContext().prompts.listSuggestions(auth.userId, input.search, input.limit);
    return Response.json({ items }, { headers: promptResponseHeaders(auth.renewalCookie) });
  } catch (error) { return promptApiError(error); }
}
