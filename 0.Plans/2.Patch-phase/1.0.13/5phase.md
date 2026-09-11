# 1.0.13 Phase 5 — 문서·개발 인수·다음 패치

상태: **완료 / no-go 인계**. 공식 provider gate가 닫혀 P2~P4를 보류하고 미완료 요구·재개 조건을 1.0.14에 넘겼다.

## 선행조건과 담당 경계

[P4](4phase.md)의 실제 산출물과 [결정 권한](../Decision-Ownership.md)을 인수한다. [세부 계약](../contracts/DICTIONARY-FONTS.md)을 따른다. 정확한 파일·SDK·명령은 착수 때 기존 구조 안에서 확정한다. 입력은 승인 범위·source SHA·fixture·실제 환경, 출력은 아래 산출물·수용 증거·미실행과 다음 단계 조건이다. 공통 파일은 한 작성자만 맡는다.

## 작업 체크리스트

- [x] `LC-NF-1.0.13-P5-01` 언어별 제공 부재·공식 출처·캐시/재배포 권리 미확인·privacy 경계·재개 조건을 ADR·제품 문서·runbook에 반영했다.
- [x] `LC-NF-1.0.13-P5-02` 제품 구현이 없어 관련 CI·동일 SHA 개발 HTTPS·세 언어 키보드/터치 smoke를 실행하지 않았고 이를 PASS로 가장하지 않았다.
- [x] `LC-NF-1.0.13-P5-03` `NF-REQ-043` 미완료와 원문·copy·selection·IME 불변조건을 1.0.14에 넘겼다.

## 수용 기준

`AC-1.0.13-05`: **PASS (no-go 인계)**. tooltip과 세 언어는 미완료이며 provider별 재개 조건·미실행·빈 릴리스 금지가 정확히 기록돼 있다.

## 검증·완료·인계

- [x] 공식 문서·출발 main SHA·미완료 요구·미실행 검사를 runbook에 연결했다.
- [x] 제품 tree를 바꾸지 않아 원문·인가·복구·기존 사용자 계약을 유지했다.
- [x] 설계/문서 no-go에 구현 CI·개발 공개 smoke·플랫폼 앱 증거를 요구하거나 성공으로 가장하지 않았다.
- [x] [Future 검수](../FUTURE-INTAKE.md)를 push 전/Phase 완료 시 대조하고 원본 blob 동일을 확인했다.
- [x] 외부 제공·실제 OS/기기·서명/스토어·release gate가 열리지 않았음을 숨기지 않았다.

[1.0.14](../1.0.14/README.md)에 산출물·지원 범위·계약·남은 gate를 전달한다. 모든 배정 Phase 인수 뒤에도 main/release 서버 변경은 [릴리스 정책](../RELEASE-POLICY.md)의 별도 현재 승인을 따른다.
