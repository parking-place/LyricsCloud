import { getAuthContext } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";
import { rateLimitResponse, requestClientKey, requestRateLimiter } from "../../../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const rate = requestRateLimiter.consume(`native-auth-start:${requestClientKey(request)}`, 20, 5 * 60_000);
    if (!rate.allowed) return rateLimitResponse(rate);
    const body = await request.json() as { codeChallenge?: unknown; redirectUri?: unknown };
    if (typeof body.codeChallenge !== "string" || typeof body.redirectUri !== "string") {
      return Response.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400, headers: nativeResponseHeaders });
    }
    const result = await getAuthContext().nativeService.begin({ codeChallenge: body.codeChallenge, redirectUri: body.redirectUri });
    return Response.json({ authorizationUrl: result.authorizationUrl.href, transaction: result.transaction,
      state: result.state, expiresAt: result.expiresAt }, { status: 201, headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
