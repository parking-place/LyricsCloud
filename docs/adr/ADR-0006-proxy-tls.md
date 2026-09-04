# ADR-0006 — reverse proxy, TLS와 WebSocket

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-10-C

## 대안

1. Caddy: 자동 HTTPS와 WebSocket reverse proxy 구성이 작다.
2. nginx: 널리 쓰이지만 인증서 자동화와 설정 관리가 별도다.
3. 앱을 직접 공개: slow-client, 요청 제한, TLS 책임이 앱에 섞인다.

## 권고 결정

홈랩 edge는 Caddy가 80/443 TLS 종료, HTTP→HTTPS, 보안 헤더, 요청 크기 제한, rate limit 경계를 담당한다. `/collaboration/*`은 WebSocket upgrade를 collaboration 서비스로, 나머지는 web으로 전달한다. 내부 upstream은 Docker network에서만 접근한다.

로컬 개발은 `localhost` HTTP를 허용하되 운영 cookie와 callback은 HTTPS만 허용한다. 신뢰 proxy CIDR을 명시하고 임의 `X-Forwarded-*`를 신뢰하지 않는다. Caddy data/config volume을 DB·backup volume과 분리한다.

## 검증·보안·철회

- 인증서 자동 갱신, WebSocket 장기 연결, 413, 보안 헤더, 잘못된 Host, reload 시 연결 동작을 시험한다.
- Caddy를 교체해도 외부 route와 upstream health 계약을 유지한다.
