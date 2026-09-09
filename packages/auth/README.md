# Authentication adapter boundary

ADR-0002에 따라 Google OpenID Connect Authorization Code + PKCE와 자체 PostgreSQL opaque session을 구현합니다. provider access token, refresh token, ID token과 authorization code는 저장하지 않습니다.
