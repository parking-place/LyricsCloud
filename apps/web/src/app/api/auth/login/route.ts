import { transactionCookie } from "@lyricscloud/auth";
import { getAuthContext } from "../../../../lib/auth-context.js";
import { errorResponse, privateResponseHeaders } from "../../../../lib/http-response.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const { config, service } = getAuthContext();
    const result = await service.beginLogin(new URL(request.url).searchParams.get("returnTo"));
    return new Response(null, {
      status: 302,
      headers: {
        ...privateResponseHeaders,
        Location: result.authorizationUrl.href,
        "Set-Cookie": transactionCookie(config, result.transaction)
      }
    });
  } catch {
    return errorResponse("AUTH_PROVIDER_UNAVAILABLE", 503);
  }
}
