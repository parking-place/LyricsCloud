# Reverse proxy boundary

The example Caddy entrypoint strips caller-supplied `CF-Connecting-IP` and `X-Real-IP` before forwarding; the app then uses Caddy's normalized `X-Forwarded-For` for per-client rate limits. Do not expose the web container directly to untrusted clients or reuse this example behind a CDN without configuring and verifying that CDN's trusted proxy ranges and header rewriting. The avatar PATCH route alone has a 2,200,000-byte proxy body cap to fit the app's 2 MiB + 50 KiB multipart cap; other routes remain at 2MB. This example is not evidence of the actual development or release proxy configuration.

HTTPS, HTTP→HTTPS 이동, WebSocket upgrade, 압축, 요청 크기 제한, 보안 header를 관리할 위치입니다. 제품 본문을 access log에 남기지 않습니다.

프록시 제품과 인증서 발급 방식은 `0.0.0` ADR에서 확정합니다.
