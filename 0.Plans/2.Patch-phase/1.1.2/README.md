# 1.1.2 — 지정 사용자 쓰기·공동 편집

상태: **P1~P2 완료 / P3 진행**. selected write의 1120 schema·W⊆R·actor/epoch 원자 ACK·rejected 복구함·server-auth awareness 기반을 동일 SHA 개발 인수했고 PC·모바일 owner/writer 흐름을 구현한다.

## 목표

읽기 권한이 있는 지정 사용자에게만 쓰기를 허용하고 기존 저장·CRDT·복구 보장을 유지한다.

## 요구사항

`NF-REQ-035`, `NF-REQ-036`. 세부 의미와 완료 판정은 [요구사항 추적표](../Requirements-Traceability.md)를 따른다. 하나의 요구가 여러 패치에 걸치면 모든 담당 범위를 검증하기 전 전체 요구를 완료 처리하지 않는다.

## 선행조건과 승인

- [1.1.1 P5](../1.1.1/5phase.md)의 실제 인수와 현재 파일 담당 경계 확인.

## 다섯 Phase

1. [P1 — 계약·실패 사례·담당 경계](1phase.md)
2. [P2 — 핵심 기반·저장과 서버](2phase.md)
3. [P3 — PC·모바일 사용자 흐름](3phase.md)
4. [P4 — 실패·권한·복구 회귀](4phase.md)
5. [P5 — 문서·개발 인수·후속 연결](5phase.md)

## 설계의 고정 조건

- W⊆R은 등급 비교가 아니라 실제 사용자 집합 검사다. R={owner,A}, W={owner,B}를 거부한다.
- 본문 writer는 ACL 변경·소유권 이전·완전 삭제·계정 관리 권한을 얻지 않는다.
- permission epoch·actor attribution·원자 ACK·undo/복구 정책을 새 공유 ADR에서 확정한다.

## 대표 수용 사례

| ID | 입력·상황 | 기대 결과 |
|---|---|---|
| `AC-1.1.2-01` | R={owner,A}, W={owner,B} 저장 | 거부하고 기존 ACL을 유지한다. |
| `AC-1.1.2-02` | 두 writer가 동시에 실제 한글 입력 | CRDT·서버·복사·재접속 원문이 수렴한다. |
| `AC-1.1.2-03` | writer 권한 회수 직전/직후 update 경쟁 | 정해진 epoch 경계만 허용하고 거부된 원문은 기기에 보존한다. |
| `AC-1.1.2-04` | writer가 ACL/탈퇴/전체 삭제 요청 | 쓰기 grant가 관리 권한으로 확대되지 않는다. |

## 범위 밖

다른 패치의 신규 기능·사용자 미선택 아이디어·승인 없는 운영/플랫폼 변경은 제외한다.

## 계약과 인수

[세부 계약](../contracts/SHARING.md) · [품질 게이트](../QUALITY-GATES.md) · [버전 규칙](../VERSIONING.md) · [릴리스 정책](../RELEASE-POLICY.md). 코드가 바뀌지 않은 연구/검증만으로 제품 tag를 발행하지 않는다. P5는 후보 인수이며 정식 main/Release/운영 변경은 별도 현재 승인 뒤 실행한다.
