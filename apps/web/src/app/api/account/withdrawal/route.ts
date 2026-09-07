import { clearSessionCookie, cookieNames, readCookie, tokenHash } from "@lyricscloud/auth";
import { getAuthContext, resolveRequestAuth } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";
import { lifecycleApiError } from "../../../../lib/lifecycle-api.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const context = getAuthContext();
    const auth = await resolveRequestAuth(request);
    const body = await request.json() as { confirmation?: unknown; exportAcknowledged?: unknown };
    if (body.confirmation !== "탈퇴" || body.exportAcknowledged !== true) return errorResponse("VALIDATION_FAILED", 400);
    const token = readCookie(request.headers.get("cookie"), cookieNames(context.config).session);
    if (!token) return errorResponse("AUTH_REQUIRED", 401);
    const purgeAt = await context.lifecycle.requestWithdrawal(auth.userId, tokenHash(token));
    return Response.json({ status: "withdrawal_pending", purgeAt: purgeAt.toISOString() }, { headers: {
      ...privateResponseHeaders,
      "Set-Cookie": clearSessionCookie(context.config),
      "Clear-Site-Data": '"cache", "cookies", "storage"'
    } });
  } catch (error) { return lifecycleApiError(error); }
}
