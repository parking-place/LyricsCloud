# 1.0.14 Phase 4 — 실제 입력·성능·개인 기능 통합

상태: **완료 — 자동·공개 입력/성능 인수 PASS, 실제 OS 폰트 전환 미실행 위험 명시**. `NF-REQ-044`의 이번 Phase 범위만 수행한다.

## 선행조건과 담당 경계

[P3](3phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DICTIONARY-FONTS.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.14-P4-01` Windows/Android/iOS 실제 실행 가능 여부와 자동 대체 경계를 분리했다. Linux Chromium의 합성 composition·200줄 장문·폰트 지연/차단 저장·재진입은 PASS했고, 실제 세 OS의 1.0.14 폰트 전환은 환경 부재로 미실행 위험에 남겼다.
- [x] `LC-NF-1.0.14-P4-02` 2,000줄·4배 CPU·8회 전환·GC heap과 cold/warm/offline·차단 조건이 승인 예산 안임을 desktop/mobile에서 검증했다.
- [x] `LC-NF-1.0.14-P4-03` 1.0.3~1.0.12의 mode/copy·정렬·Suno 링크·개인 흐름 전체 회귀를 재사용하고 폰트와의 새 상호작용을 확인했다. 1.0.13 사전은 provider no-go라 구현이 없음을 숨기지 않았다.

## 수용 기준

`AC-1.0.14-04`: 예산·glyph·IME 수용이 있고 개인 흐름의 원문·copy·목록 정렬이 보존된다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 [P4 인수 기록](../../../docs/runbooks/1.0.14-phase4-font-integration.md)의 실제 증거·환경·후보 `1753ee047e2afaa73cc09c50e354d7729e8850ba`를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 로컬 desktop/mobile 4건, Actions push `34656715638`·PR `34656718443`, 네 dev image 게시/서명, 동일 SHA 개발 공개 smoke를 인수했다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 원본 blob 동일과 재배정 없음을 기록했다.
- [x] 실제 Windows/Android/iOS·물리 저사양 기기·스토어 검사는 미실행이고 P5 release note에 알려진 위험으로 인계함을 명시했다.

[P5](5phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
