import { AuthError, transactionCookie } from "@lyricscloud/auth";
import type { ErrorCode } from "@lyricscloud/domain";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";
import { mutationOriginAllowed } from "../../../../lib/song-api.js";
import {
  apiBodyExceedsLimit,
  rateLimitResponse,
  requestClientKey,
  requestRateLimiter
} from "../../../../lib/request-security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = getAuthContext();
    if (!mutationOriginAllowed(request)) return errorResponse("FORBIDDEN", 403);
    const rate = requestRateLimiter.consume(`auth-signup:${requestClientKey(request)}`, 10, 15 * 60_000);
    if (!rate.allowed) return rateLimitResponse(rate);
    if (await apiBodyExceedsLimit(request, 4_096)) return errorResponse("PAYLOAD_TOO_LARGE", 413);
    const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json") return errorResponse("BETA_SIGNUP_INVALID", 422);
    const body: unknown = await request.json();
    if (!isSignupBody(body)) return errorResponse("BETA_SIGNUP_INVALID", 422);
    const result = await context.service.beginBetaSignup({ code: body.code, email: body.email, returnTo: "/workspace" });
    return Response.json(
      { authorizationUrl: result.authorizationUrl.href },
      { status: 200, headers: { ...privateResponseHeaders, "Set-Cookie": transactionCookie(context.config, result.transaction) } }
    );
  } catch (error) {
    const code: ErrorCode = error instanceof AuthError ? error.code : "AUTH_PROVIDER_UNAVAILABLE";
    const status = code === "BETA_SIGNUP_INVALID" ? 422 : 503;
    return errorResponse(code, status);
  }
}

function isSignupBody(value: unknown): value is { code: string; email: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return Object.keys(body).every((key) => key === "code" || key === "email")
    && typeof body.code === "string" && body.code.length <= 64
    && typeof body.email === "string" && body.email.length <= 512;
}
