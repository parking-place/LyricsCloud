# Web application boundary

15개 제품 화면의 PC·모바일 UI, HTTP 요청, Google 로그인, 세션, 내보내기 요청을 담당합니다. 0.0.0에는 15개 route 상태를 보여주는 반응형 중립 화면과 liveness/readiness endpoint만 구현합니다.

화면은 [`0.Plans/Mock-up`](../../0.Plans/Mock-up/)을 참고하되 별도의 PC·모바일 DOM을 복제하지 않고 반응형 컴포넌트로 구현합니다.
