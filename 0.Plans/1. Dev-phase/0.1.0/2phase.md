# 0.1.0 Phase 2 — Google 인증과 세션 경계

- 상태: **대기**
- 버전 상태: [../STATUS.md](../STATUS.md)

## 목표

Google 계정으로 가입과 로그인을 하나의 흐름으로 제공하고, 서버가 검증한 사용자 신원만 보호 route와 데이터 계층에 전달하도록 인증·세션 경계를 구현한다.

## 선행조건

- 0.1.0 Phase 1의 실행·설정·오류 기반이 완료되어야 한다.
- 인증과 세션 ADR이 Accepted 상태여야 한다.
- 개발·미리보기·운영 callback 주소와 OAuth 자격 증명 소유자가 정해져야 한다.

## 기준 문서

- [기능 기획](../../Sketch.md)
- [기술 선택과 결정 기록](../../Implementation-Stack.md)
- [로그인 화면 설명](../../Mock-up/01-auth/README.md)
- [개발 버전 상태](../STATUS.md)

## 포함 범위

- Google OpenID Connect 로그인 시작과 callback
- Authorization Code, PKCE, state, nonce 검증
- 공급자 고정 사용자 ID와 내부 사용자 ID 연결
- 로그인 세션 생성·검증·갱신·만료
- 로그인 상태 유지와 로그아웃
- DEC-02-A에 맞춘 비공개·초대 사용자 허용 경계
- 로그인 성공 후 허용된 내부 경로로만 복귀
- 인증 실패·취소·만료의 안정된 오류 코드

## 제외 범위

- 로그인 화면의 최종 PC·모바일 디자인
- 회원 탈퇴와 데이터 내보내기
- 팀·공유·다중 사용자 공동 편집
- Google Drive, Gmail, YouTube 권한
- Google provider access token의 별도 저장

## 작업 체크리스트

- [ ] LC-010-P2-01 — 로그인 시작 요청에 state, nonce, PKCE 값을 생성하고 세션과 안전하게 연결한다.
- [ ] LC-010-P2-02 — callback에서 code, state, nonce, redirect 목적지를 모두 검증한 뒤에만 세션을 발급한다.
- [ ] LC-010-P2-03 — Google 이메일이 아닌 provider subject와 issuer 조합을 내부 사용자 식별 기준으로 저장한다.
- [ ] LC-010-P2-04 — OAuth scope를 openid, email, profile로 제한하고 추가 Google 토큰을 보관하지 않는다.
- [ ] LC-010-P2-05 — 초대되지 않은 계정에는 세션을 만들지 않고 사용자용 안내 코드로 종료한다.
- [ ] LC-010-P2-06 — 세션 쿠키에 Accepted ADR의 Secure, HttpOnly, SameSite, 만료 정책을 적용한다.
- [ ] LC-010-P2-07 — 만료 임박 세션 갱신과 갱신 실패 시 재로그인 전환을 구현한다.
- [ ] LC-010-P2-08 — 로그아웃 시 서버 세션을 무효화하고 인증 캐시 제거 신호를 반환한다.
- [ ] LC-010-P2-09 — 외부 URL과 프로토콜 상대 URL을 로그인 후 redirect로 사용할 수 없게 한다.
- [ ] LC-010-P2-10 — 취소, 잘못된 state, 재사용 code, 만료 세션을 각각 다른 테스트 사례로 만든다.

## 검증 방법

- 허용 계정으로 최초 로그인과 재로그인을 수행해 내부 사용자 ID가 중복 생성되지 않는지 확인한다.
- 브라우저를 닫았다 열어도 정책 범위 안에서 로그인 상태가 유지되는지 확인한다.
- state 변조, callback 재전송, 허용되지 않은 redirect가 차단되는지 확인한다.
- 초대되지 않은 Google 계정이 보호 route에 도달하지 못하는지 확인한다.
- 로그아웃 후 기존 페이지 새로고침과 API 요청이 모두 인증 실패하는지 확인한다.
- 로그와 DB에 Google access token, refresh token, authorization code가 남지 않는지 검색한다.

## 완료 조건

- [ ] Google 로그인·가입이 동일 진입점에서 성공한다.
- [ ] callback 보안 검증과 내부 redirect 제한이 동작한다.
- [ ] 로그인 유지·갱신·로그아웃이 서버 세션과 일치한다.
- [ ] 비공개 베타 허용 경계가 적용됐다.
- [ ] 추가 Google 권한과 provider token을 저장하지 않는다.
- [ ] 인증 실패가 사용자용 코드와 진단용 요청 ID로 구분된다.

## 산출물

- 로그인 시작·callback·로그아웃 경로
- 세션 검증 미들웨어 또는 동등 경계
- 내부 사용자 식별 매핑
- 인증 오류 코드표
- OAuth 보안 통합 테스트

## 다음 Phase 인계

Phase 3에 검증된 내부 사용자 ID, 요청별 인증 context, 세션 만료·로그아웃 이벤트, 허용 계정 규칙을 전달한다. 데이터 계층은 callback 입력이나 이메일을 owner ID로 직접 사용하지 않는다.
