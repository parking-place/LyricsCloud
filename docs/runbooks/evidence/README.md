# Verification evidence

버전·Phase 검증에서 생성한 합성 데이터 기반 캡처와 보고서를 보관합니다. 실제 사용자 창작물이나 비밀 값은 넣지 않습니다.

`0.1.0-phase5-*` 4장은 Playwright의 1440×1000 desktop과 390×844 mobile project에서 생성한 로그인·보호 셸 기준이다. pixel 비교 원본은 `tests/e2e/auth-ui.spec.ts-snapshots/`에 함께 저장한다.

`0.9.0-phase1/`은 15개 목업 화면을 `pc` 1440×1000, `narrow-pc` 1024×768, `tablet` 768×1024, `mobile` 390×844에서 같은 격리 합성 계정으로 캡처한 60장 기준선이다. 생성 조건과 화면별 판정은 [`0.9.0 UI 감사`](../../architecture/0.9.0-UI-AUDIT.md), 재현 코드는 [`ui-audit.spec.ts`](../../../tests/e2e/ui-audit.spec.ts)를 따른다.
