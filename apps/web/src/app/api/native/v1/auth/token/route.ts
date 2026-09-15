import { getAuthContext } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";
import { rateLimitResponse, requestClientKey, requestRateLimiter } from "../../../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const rate = requestRateLimiter.consume(`native-auth-token:${requestClientKey(request)}`, 30, 5 * 60_000);
    if (!rate.allowed) return rateLimitResponse(rate);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.transaction !== "string" || typeof body.state !== "string"
      || typeof body.code !== "string" || typeof body.codeVerifier !== "string") {
      return Response.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400, headers: nativeResponseHeaders });
    }
    const result = await getAuthContext().nativeService.exchange({ transaction: body.transaction, state: body.state,
      code: body.code, codeVerifier: body.codeVerifier });
    return Response.json({ tokenType: "Bearer", accessToken: result.sessionToken, scope: result.scope,
      expiresAt: result.expiresAt, user: { id: result.userId } }, { headers: nativeResponseHeaders });
  } catch (error) { return nativeApiError(error); }
}
