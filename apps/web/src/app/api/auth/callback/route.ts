import { AuthError, clearTransactionCookie, sessionCookie } from "@lyricscloud/auth";
import type { AuthConfig } from "@lyricscloud/config";
import type { ErrorCode } from "@lyricscloud/domain";
import { createRequestId } from "@lyricscloud/observability";
import { cookieNames, readCookie } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { privateResponseHeaders } from "../../../../lib/http-response.js";
import { rateLimitResponse, requestClientKey, requestRateLimiter } from "../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  let config: AuthConfig | undefined;
  try {
    const rate = requestRateLimiter.consume(`auth-callback:${requestClientKey(request)}`, 40, 5 * 60_000);
    if (!rate.allowed) return rateLimitResponse(rate);
    const context = getAuthContext();
    config = context.config;
    const incoming = new URL(request.url);
    const callbackUrl = new URL(`/api/auth/callback${incoming.search}`, config.appOrigin);
    const transaction = readCookie(request.headers.get("cookie"), cookieNames(config).transaction);
    const result = await context.service.completeLogin(callbackUrl, transaction);
    const account = await context.lifecycle.getAccountLifecycle(result.userId);
    const returnTo = account?.status === "withdrawal_pending" ? "/account/withdrawal" : result.returnTo;
    const destination = new URL(returnTo, config.appOrigin);
    destination.searchParams.set("auth", "success");
    const headers = new Headers({ ...privateResponseHeaders, Location: destination.href });
    headers.append("Set-Cookie", sessionCookie(config, result.sessionToken));
    headers.append("Set-Cookie", clearTransactionCookie(config));
    return new Response(null, {
      status: 303,
      headers
    });
  } catch (error) {
    if (!config) {
      const requestId = createRequestId();
      return Response.json({ error: { code: "AUTH_PROVIDER_UNAVAILABLE", requestId } },
        { status: 503, headers: { ...privateResponseHeaders, "x-request-id": requestId } });
    }
    const code: ErrorCode = error instanceof AuthError ? error.code : "AUTH_PROVIDER_UNAVAILABLE";
    const target = new URL("/auth", config.appOrigin);
    target.searchParams.set("error", code);
    if (error instanceof AuthError && error.flow === "signup") target.searchParams.set("flow", "signup");
    const requestId = createRequestId();
    target.searchParams.set("requestId", requestId);
    return new Response(null, {
      status: 303,
      headers: { ...privateResponseHeaders, Location: target.href, "Set-Cookie": clearTransactionCookie(config), "x-request-id": requestId }
    });
  }
}
