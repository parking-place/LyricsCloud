# 1.0.14 Phase 1 — 폰트 후보·권리·예산

상태: **완료**. Noto Sans KR 2.004 Regular 자체 호스팅·OFL 고지·글리프/fallback·cold/warm 예산을 승인했다.

## 선행조건과 담당 경계

[1.0.13](../1.0.13/README.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DICTIONARY-FONTS.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.14-P1-01` 공식 Noto CJK release·Korean subset 안내·OFL 원문과 ZIP/OTF/license 해시를 확인하고 자체 번들/재배포 고지를 ADR-NF-007에 기록했다.
- [x] `LC-NF-1.0.14-P1-02` Latin·한글 완성형/조합 자모·Kana·선별 Han 범위와 system sans fallback을 PROD-NF-008에 정의했다.
- [x] `LC-NF-1.0.14-P1-03` 현재 public 4,702B·font 0건 기준에서 Regular 1파일 4,644,748B만 추가하고 cold 1건/4.7MB·warm/offline 0건·JS 20KB gzip 이하 예산을 승인했다. 모든 글리프 지원을 주장하지 않는다.

## 수용 기준

`AC-1.0.14-01`: **PASS**. system stack·공식 Noto 자체 호스팅·외부 CDN 후보의 라이선스/고지/글리프/용량과 도입·보류 이유가 있다.

## 검증·완료·인계

- [x] 공식 URL·실제 ZIP/OTF/license SHA-256·fontconfig 글리프 범위·출발 main SHA를 연결했다.
- [x] 설계 문서만 변경해 원문·인가·복구·기존 사용자 계약을 유지했다.
- [x] 설계 Phase라 구현 CI·동일 SHA 공개 smoke를 실행했다고 주장하지 않았다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 원본 blob 동일을 확인했다.
- [x] 실제 Windows/iOS/Android·서명/스토어·release gate는 후속 Phase 미실행으로 남겼다.

[P2](2phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
