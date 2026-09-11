# 1.0.14 Phase 3 — 설정·미리보기·편집 적용

상태: **완료**. `NF-REQ-044`의 이번 Phase 범위와 `AC-1.0.14-03`을 인수했다.

## 선행조건과 담당 경계

[P2](2phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DICTIONARY-FONTS.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.14-P3-01` 설정에 승인 폰트 목록·대표 다국어 미리보기·선택 영속을 제공하고 가사/라임/프롬프트 편집 표시로 연결한다.
- [x] `LC-NF-1.0.14-P3-02` 폰트 교체 시 cursor·selection·undo·scroll·IME 조합이 유지되고 원문/실제 copy output은 변경하지 않는다.
- [x] `LC-NF-1.0.14-P3-03` 모바일 글자 확대·줄 높이·tooltip·presence label의 overflow와 접근성 이름을 확인한다.

## 수용 기준

`AC-1.0.14-03`: **PASS**. 새로고침 뒤 선택이 유지되고 한글/영어/일어 표시와 복사 원문이 같다.

## 검증·완료·인계

- [x] 위 작업과 수용 기준에 실제 증거·환경·SHA를 연결하고 실패/미실행을 기록했다.
- [x] 원문·인가·복구·기존 사용자 계약을 유지하고 [품질 게이트](../QUALITY-GATES.md)의 영향 검사만 수행했다. 같은 성공 결과를 반복하지 않았다.
- [x] 구현 후보 `ffcf97f5e51a7228895079f4a600ef9133682237`의 전체 CI 두 run, 네 dev image와 동일 SHA 개발 공개 smoke를 인수했다. 실제 물리 OS/기기 증거는 P4 미실행으로 남겼다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 같은 변경은 이전 기록을 참조했다.
- [x] 실제 Windows/Android/iOS IME·slow/offline 성능·release gate의 상태를 P4/P5 미실행으로 숨기지 않았다.

세부 증거와 rollback은 [Phase 3 runbook](../../../docs/runbooks/1.0.14-phase3-font-selection.md)에 있다.

[P4](4phase.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
