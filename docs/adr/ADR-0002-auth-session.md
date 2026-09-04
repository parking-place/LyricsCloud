# ADR-0002 — Google OIDC, 세션과 초대 경계

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-02-A, DEC-09-A

## 질문과 범위

Google을 로그인에만 사용하면서 비공개·초대 베타의 사용자 식별, 세션 무효화, 탈퇴를 누가 책임지는가. Drive·Gmail 권한과 Google API 호출은 제외한다.

## 대안

1. 범용 인증 프레임워크와 adapter: 빠르지만 불필요한 provider token 저장과 schema 결합 위험이 있다.
2. `openid-client`로 Authorization Code + PKCE를 처리하고 자체 DB session을 발급한다.
3. 브라우저 ID token만 신뢰하거나 인증을 생략한다: 서버 검증·철회 요구를 충족하지 못한다.

## 권고 결정

`openid-client`를 얇은 auth adapter에서만 사용한다. scope는 `openid email profile`로 제한하고 state·nonce·PKCE를 검증한다. Google `sub`를 외부 식별자로 매핑하되 내부 불투명 `user_id`를 소유권 키로 사용한다. verified email이 allowlist/invite에 있을 때만 계정을 활성화한다.

콜백에서 ID token claims를 검증한 뒤 access token·refresh token·ID token을 영속화하지 않는다. 무작위 opaque session ID의 해시만 PostgreSQL에 저장하고 HttpOnly·Secure·SameSite=Lax 쿠키를 사용한다. 로그아웃·탈퇴 시작·관리자 차단은 모든 session을 폐기한다. 탈퇴 철회는 재인증 뒤 7일 안에만 가능하다.

## 검증·보안·철회

- issuer·audience·nonce·state·PKCE·이메일 검증과 callback allowlist를 시험한다.
- 세션 고정, CSRF, 미허용 사용자, 재사용 callback, 로그아웃 후 WebSocket을 차단한다.
- adapter 경계 때문에 다른 OIDC 라이브러리로 교체해도 domain user/session 계약은 유지된다.

참고: Google은 서버 측 ID token 검증을 요구하며, openid-client는 discovery, PKCE, authorization-code 검증 API를 제공한다.
