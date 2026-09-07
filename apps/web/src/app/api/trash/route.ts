import { parseTrashType } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../lib/auth-context.js";
import { lifecycleApiError, lifecycleResponseHeaders } from "../../../lib/lifecycle-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await resolveRequestAuth(request);
    const items = await getAuthContext().lifecycle.listTrash(auth.userId, parseTrashType(new URL(request.url).searchParams.get("type")));
    return Response.json({ items }, { headers: lifecycleResponseHeaders(auth.renewalCookie) });
  } catch (error) { return lifecycleApiError(error); }
}
