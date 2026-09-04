import { clearSessionCookie, cookieNames, readCookie } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const { config, service } = getAuthContext();
    if (request.headers.get("origin") !== config.appOrigin) return errorResponse("FORBIDDEN", 403);
    const token = readCookie(request.headers.get("cookie"), cookieNames(config).session);
    await service.logout(token);
    return Response.json(
      { authenticated: false },
      { headers: {
        ...privateResponseHeaders,
        "Set-Cookie": clearSessionCookie(config),
        "Clear-Site-Data": '"cache", "storage"'
      } }
    );
  } catch {
    return errorResponse("AUTH_PROVIDER_UNAVAILABLE", 503);
  }
}
