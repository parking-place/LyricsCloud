import { randomUUID } from "node:crypto";
import { AuthError, clearTransactionCookie, sessionCookie } from "@lyricscloud/auth";
import type { AuthConfig } from "@lyricscloud/config";
import type { ErrorCode } from "@lyricscloud/domain";
import { cookieNames, readCookie } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  let config: AuthConfig | undefined;
  try {
    const context = getAuthContext();
    config = context.config;
    const incoming = new URL(request.url);
    const callbackUrl = new URL(`/api/auth/callback${incoming.search}`, config.appOrigin);
    const transaction = readCookie(request.headers.get("cookie"), cookieNames(config).transaction);
    const result = await context.service.completeLogin(callbackUrl, transaction);
    const headers = new Headers({ ...privateResponseHeaders, Location: new URL(result.returnTo, config.appOrigin).href });
    headers.append("Set-Cookie", sessionCookie(config, result.sessionToken));
    headers.append("Set-Cookie", clearTransactionCookie(config));
    return new Response(null, {
      status: 303,
      headers
    });
  } catch (error) {
    if (!config) return Response.json({ error: { code: "AUTH_PROVIDER_UNAVAILABLE", requestId: randomUUID() } }, { status: 503, headers: privateResponseHeaders });
    const code: ErrorCode = error instanceof AuthError ? error.code : "AUTH_PROVIDER_UNAVAILABLE";
    const target = new URL("/auth", config.appOrigin);
    target.searchParams.set("error", code);
    target.searchParams.set("requestId", randomUUID());
    return new Response(null, {
      status: 303,
      headers: { ...privateResponseHeaders, Location: target.href, "Set-Cookie": clearTransactionCookie(config) }
    });
  }
}
