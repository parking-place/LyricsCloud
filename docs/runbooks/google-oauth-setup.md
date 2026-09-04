# Google OAuth 개발 설정

실제 자격 증명은 저장소나 채팅에 남기지 않고 로컬 `.env`에만 둔다.

1. Google Cloud Console에서 프로젝트를 선택하고 OAuth 동의 화면을 구성한다. 테스트 상태라면 로그인할 Google 계정을 테스트 사용자로 등록한다.
2. OAuth client 유형을 `Web application`으로 만들고 개발용 승인 redirect URI를 `http://localhost:8080/api/auth/callback`으로 등록한다.
3. 저장소 루트에서 `.env.example`을 `.env`로 복사하고 모든 `CHANGE_ME`를 교체한다.
4. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에는 Web client 값을 넣는다.
5. `SESSION_SECRET`에는 최소 32바이트의 새 무작위 값을 넣는다. 예: `openssl rand -base64 48`의 출력.
6. `AUTH_ALLOWED_EMAILS`에는 로그인 허용 계정을 쉼표로 구분해 넣는다. 이 목록 밖의 검증된 Google 계정에는 세션이 발급되지 않는다.
7. `docker compose config --quiet`과 `docker compose up --build --wait`를 실행한 뒤 `http://localhost:8080/api/auth/login`에서 확인한다.

운영에서는 `APP_ORIGIN`과 redirect URI를 동일한 HTTPS origin으로 바꾸고, Google issuer override를 사용하지 않는다. 자격 증명을 노출했다면 즉시 Google Cloud에서 client secret을 교체하고 session secret 변경 후 기존 세션을 폐기한다.
