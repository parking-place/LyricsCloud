import { AuthError } from "@lyricscloud/auth";
import { getAuthContext, RequestAuthError, resolveRequestAuth } from "../../../../../../lib/auth-context.js";
import { nativeApiError, nativeResponseHeaders } from "../../../../../../lib/native-api.js";
import { rateLimitResponse, requestClientKey, requestRateLimiter } from "../../../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const transaction = incoming.searchParams.get("transaction") ?? "";
  try {
    const rate = requestRateLimiter.consume(`native-auth-authorize:${requestClientKey(request)}`, 30, 5 * 60_000);
    if (!rate.allowed) return rateLimitResponse(rate);
    let auth: { userId: string };
    try { auth = await resolveRequestAuth(request); } catch (error) {
      if (!(error instanceof RequestAuthError) && !(error instanceof AuthError)) throw error;
      const login = new URL("/api/auth/login", getAuthContext().config.appOrigin);
      login.searchParams.set("returnTo", `${incoming.pathname}${incoming.search}`);
      return new Response(null, { status: 303, headers: { ...nativeResponseHeaders, Location: login.href } });
    }
    const result = await getAuthContext().nativeService.authorize(transaction, auth.userId);
    return new Response(null, { status: 303, headers: { ...nativeResponseHeaders, Location: result.redirectUrl.href } });
  } catch (error) { return nativeApiError(error); }
}
