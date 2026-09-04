# End-to-end tests

0.0.0에서는 Playwright가 1440px PC와 390×844 모바일 중립 화면의 overflow, 15개 route 표시와 health 의미를 검증하고 `docs/runbooks/evidence`에 smoke 캡처를 남깁니다.

0.1.0 Phase 5 인증 테스트는 로컬 OIDC 프로토콜 fixture를 사용합니다. Google이나 실제 계정·client secret·session·provider token을 사용하지 않습니다.

이미 migration이 적용된 폐기 가능한 PostgreSQL DB를 지정해 실행합니다.

```bash
E2E_DATABASE_URL=postgresql://lyricscloud_test:lyricscloud_test_only@127.0.0.1:5432/lyricscloud_test pnpm test:e2e
```

global setup은 이름이 `_test`로 끝나는 `E2E_DATABASE_URL`만 받고, 해당 DB의 인증·profile 테이블을 비운 뒤 결정적인 A/B·시각 fixture를 만듭니다. 개발·릴리스 DB를 지정하면 안 됩니다. Playwright는 로컬 OIDC fixture를 `127.0.0.1:3100`, production build를 `127.0.0.1:3000`에서 시작합니다.

후속 버전에서는 창작·검색·복구까지 확장합니다. 브라우저 이름이나 스크린샷만으로 통과시키지 않고 사용자가 보는 상태 문구와 저장된 결과를 함께 확인합니다.
