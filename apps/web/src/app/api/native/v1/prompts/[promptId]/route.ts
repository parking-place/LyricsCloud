import { isResourceId } from "@lyricscloud/domain";
import { getAuthContext, resolveNativeRequestAuth } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ promptId: string }> }): Promise<Response> {
  try {
    const auth = await resolveNativeRequestAuth(request); const { promptId } = await params;
    const prompt = isResourceId(promptId) ? await getAuthContext().prompts.getPrompt(auth.userId, promptId) : null;
    return prompt ? Response.json({ prompt }, { headers: nativeResponseHeaders })
      : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
