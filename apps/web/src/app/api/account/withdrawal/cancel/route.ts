import { getAuthContext, resolvePendingWithdrawalAuth } from "../../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../../lib/http-response.js";
import { lifecycleApiError } from "../../../../../lib/lifecycle-api.js";
import { mutationOriginAllowed } from "../../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const auth = await resolvePendingWithdrawalAuth(request);
    const body = await request.json() as { confirmation?: unknown };
    if (body.confirmation !== "철회") return errorResponse("VALIDATION_FAILED", 400);
    if (!await getAuthContext().lifecycle.cancelWithdrawal(auth.session.userId, auth.tokenHash)) return errorResponse("CONFLICT", 409);
    return Response.json({ status: "active" }, { headers: privateResponseHeaders });
  } catch (error) { return lifecycleApiError(error); }
}
