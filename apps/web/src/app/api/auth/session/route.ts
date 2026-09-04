import { AuthError, cookieNames, readCookie, sessionCookie } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { config, service } = getAuthContext();
    const token = readCookie(request.headers.get("cookie"), cookieNames(config).session);
    const result = await service.resolveSession(token);
    const headers: Record<string, string> = { ...privateResponseHeaders };
    if (result.renewed && token) headers["Set-Cookie"] = sessionCookie(config, token, result.maxAge);
    return Response.json({ authenticated: true, user: { id: result.userId } }, { headers });
  } catch (error) {
    return errorResponse(error instanceof AuthError ? error.code : "AUTH_PROVIDER_UNAVAILABLE", error instanceof AuthError ? 401 : 503);
  }
}
