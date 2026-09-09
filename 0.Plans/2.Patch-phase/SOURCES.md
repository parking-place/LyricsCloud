# 요구·규정·공식 참고 자료

## 작성 기준

사용자가 대화에 제공한 1.0.1 필수 항목·후속 기능·5Phase/새 폴더·보수적 버전 정책을 범위 원본으로 사용했다. 기존 규정/계약의 참고 코드는 고정 SHA `7448f47b0dbbc51ab3bcda13876b63ef72c102d2`다. 이는 과거 참고점이며 현재 원격/로컬 최신 코드나 P6 완료를 뜻하지 않는다.

이번 산출물은 제공된 계획·규정 내용을 읽어 작성한 문서다. 원격/로컬 앱 코드·진행 STATUS·PR·배포를 수정하지 않았고, 현재 GitHub/개발·운영 서버의 상태를 재확인한 것으로 설명하지 않는다. 실제 착수 시 현재 코드를 다시 읽는다.

## 프로젝트 규정 참고

| ID | 자료 | 활용 |
|---|---|---|
| SRC-REPO-01 | [Agent entry](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/AGENTS.md) | 작업 시작/완료/상위 규칙 포인터 |
| SRC-REPO-02 | [Agent rules](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/Agent.md) | 보호 문서·현재 Phase·IME·데이터·배포 규칙 |
| SRC-REPO-03 | [기존 실행 계획](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/1.%20Dev-phase/README.md) | 5 Phase 구조·품질 게이트 |
| SRC-REPO-04 | [기존 Phase 예시](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/1.%20Dev-phase/1.0.0/1phase.md) | 작업/완료 체크·검증·산출물·인계 형식 |
| SRC-REPO-05 | [결정 권한](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/1.%20Dev-phase/Decision-Ownership.md) | ADR/PROD/OPS 상태·승인·대체 기록 |
| SRC-REPO-06 | [선택된 스택](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/Implementation-Stack.md) | DEC-01-D·02-A·03-A·04-A·FINAL-APPROVAL 및 기존 범위 |
| SRC-REPO-07 | [원본 기능 기획](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/Sketch.md) | 라임/prompt 순수 텍스트·copy·재사용 의미 |
| SRC-REPO-08 | [화면 목업 색인](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/0.Plans/Mock-up/README.md) | 15개 화면·PC/mobile·공통 원칙 |
| SRC-REPO-09 | [기존 1.0.1 backlog](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/docs/operations/1.0.1-backlog.md) | OPS-100-001·RC-091-001·RC-100-001·RC-091-002 인수 |
| SRC-REPO-10 | [인증 service](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/packages/auth/src/service.ts) | 현재 allowedEmails·OAuth transaction·identity/session 경계 |
| SRC-REPO-11 | [OIDC adapter](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/packages/auth/src/oidc.ts) | 현재 openid email profile·PKCE·claims |
| SRC-REPO-12 | [현재 manifest](https://github.com/parking-place/LyricsCloud/blob/7448f47b0dbbc51ab3bcda13876b63ef72c102d2/package.json) | Node24/pnpm11 범위·실제 실행 명령·lint 한계 |



## 공식 참고와 확인 범위

작성 시 Google OIDC·OWASP token/authorization·RFC 8252 원문을 열어 기본 원칙을 확인했다. 이 자료가 특정 LyricsCloud schema·6자리 운영 예산·복구 정책을 표준으로 승인하는 것은 아니다.

| 자료 | 용도·한계 |
|---|---|
| [Google OIDC](https://developers.google.com/identity/openid-connect/openid-connect) | token 검증과 issuer/sub·이메일 식별 한계, Android 플랫폼 sign-in 참고 |
| [OWASP token 지침](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) | 무작위·단일 사용·보관·만료·rate limit의 일반 원칙을 초대 코드에 응용 |
| [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) | default-deny·요청별 인가·권한 테스트 |
| [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html) | native OAuth를 선택할 때 외부 user-agent·PKCE 참고 |
| [CodeMirror reference](https://codemirror.net/docs/ref/) | IME/transaction 계약 확인 대상. 이번 열기에서는 본문 확인 실패; 현재 IME 결함 원인 확정 근거로 사용하지 않음 |
| [OWASP SSRF](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) | 외부 metadata adapter의 주소·redirect·내부망 방어 착수 시 확인 |
| [WinUI](https://learn.microsoft.com/en-us/windows/apps/winui/winui3/) / [Android Compose](https://developer.android.com/compose) | 선택 후보. 버전/도입/구현 승인 아님 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 실제 자동·수동 접근성 인수 시 기준 대조 |
| [SemVer](https://semver.org/) | 발행 버전 불변 원칙 참고. 본 프로젝트의 patch 기능 확장 정책은 일반적인 SemVer 의미와 구분 |

Google Console Audience/test-user 자동 등록 API나 Suno metadata 자동 취득 API를 확보했다고 주장하지 않는다. 실제 scope·설정·정책·provider를 해당 P1에서 확인한다. 모델명은 사용자 제공 예시, 1,000/3,000은 사용자 지정 비차단 경고 기준이다. 라이브러리/컨테이너가 현재 최신이라는 주장은 하지 않으며 실행 때 공식 지원/보안 공지를 대조한다.


## 2026-09-09 부모가 직접 검증해 인계한 출처

| 출처 | 확인 내용과 계획의 한계 |
|---|---|
| [CSS Liquid Glass 모음](https://freefrontend.com/css-liquid-glass/) | Liquid Glass Effect와 Liquid Toggle Switch가 존재한다. 디자인 참조이며 전 브라우저 성능·개별 demo 라이선스를 보장하지 않는다. |
| [Liquid Glass Effect 원작](https://codepen.io/daftplug/pen/QwbaYGO), [Liquid Toggle Switch 원작](https://codepen.io/jh3y/pen/bNVWoBW) | 위 두 예제 원작 demo 링크. 실제 코드/자산 재사용 권리는 도입 시 별도 확인한다. |
| [Apple WWDC25 Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | visuals와 motion을 함께 설계하고 reduced transparency/increased contrast/reduced motion에 대응하는 참고. 특정 SDK 채택 결정이 아니다. |
| [NAVER 공개 API 목록](https://developers.naver.com/products/intro/plan/plan.md), [백과사전 검색](https://developers.naver.com/docs/serviceapi/search/encyclopedia/encyclopedia.md) | 백과사전 검색은 확인했으나 세 언어 사전 뜻풀이 공개 API는 이 목록만으로 확인하지 못했다. 제공/조건 검증을 1.0.13 P1 gate로 둔다. |
| [나눔 다운로드](https://hangeul.naver.com/download), [폰트 이용 안내](https://help.naver.com/service/11029/contents/18088?lang=ko&osType=PC) | 나눔 사용 및 번들/재배포 시 라이선스·저작권 고지, 폰트 자체 유료 판매 제한을 확인했다. 폰트별 원문·서브셋 조건은 1.0.14 P1에서 확인한다. |
| [Google Audience Testing 예외](https://support.google.com/cloud/answer/15549945?hl=en) | 기본 프로필/메일/OpenID 또는 Sign in with Google 인증만이면 Test users 명단 등록이 필요 없는 예외가 있다. 부모 확인 현재 `packages/auth/src/oidc.ts:38`은 `openid email profile`만 요청한다. 실제 scope/Audience/조직·계정 제한을 확인하고 추가 scope 도입 시 재평가한다. |

기존 ID token 검증과 issuer+sub 소유자 식별 경계는 유지한다. 앱 베타 grant 등록은 Google Console 설정 자동화와 별개다. 위 출처 인계는 문서 담당자가 같은 조사를 반복했다는 뜻이 아니다.
