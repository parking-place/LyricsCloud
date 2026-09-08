import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiBodyExceedsLimit } from "./lib/request-security.js";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest): Promise<Response> {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'"
  ].join("; ");
  if (request.nextUrl.pathname.startsWith("/api/") && BODY_METHODS.has(request.method)
    && await apiBodyExceedsLimit(request)) {
    return Response.json(
      { error: { code: "PAYLOAD_TOO_LARGE", requestId: crypto.randomUUID() } },
      { status: 413, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "Content-Security-Policy": csp } }
    );
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js).*)" }]
};
