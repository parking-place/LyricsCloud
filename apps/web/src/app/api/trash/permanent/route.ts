import { parseTrashMutationInput } from "@lyricscloud/domain";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse } from "../../../../lib/http-response.js";
import { lifecycleApiError, lifecycleResponseHeaders } from "../../../../lib/lifecycle-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolveRequestAuth(request);
    const input = parseTrashMutationInput(await request.json());
    const deleted = await getAuthContext().lifecycle.permanentlyDelete(auth.userId, input.items, input.confirmedTitles);
    return Response.json({ deleted }, { headers: lifecycleResponseHeaders(auth.renewalCookie) });
  } catch (error) { return lifecycleApiError(error); }
}
