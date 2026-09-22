# 1.2.2 수용 기준 — 프롬프트 동시 편집·IME·태그 무결성

**계획 기준이며 아래 항목의 실행 결과는 모두 미확인이다.** 테스트 이름/명령은 실제 착수 시 현행 manifest와 대조해 정한다. 존재하지 않는 script가 이미 있다고 가정하지 않는다.

[버전 계획](README.md) · [공통 gate](../QUALITY-GATES.md) · [추적표](../REVIEW-TRACEABILITY.md)

| 수용 ID | 대상 | 통과 기준 | 상태 |
|---|---|---|---|
| `AC-RD-122-01` | 부분 편집 | 같은 문장의 앞/뒤 비중첩 수정은 두 의도를 보존한다. 같은 위치 삽입·삭제/삽입 교차·한글/emoji/개행/붙여넣기/undo/재연결에서 정한 정책으로 수렴하고 Y.Text·서버 재조회가 일치한다. | planned / 미실행 |
| `AC-RD-122-02` | 조합 보존 | composition 중 remote prefix/suffix/선택구간 수정·두 update 수신 뒤 로컬 확정과 원격 확정이 모두 남는다. 제목·문장형 모두 조합 취소/blur/즉시 이탈/undo를 검증하고 실제 OS IME 인수를 분리한다. | planned / 미실행 |
| `AC-RD-122-03` | 태그 수렴 | 동일 태그 move/move·move/remove·같은/다른 목적지·서로 다른 태그·역순/중복 전달에서 replica와 raw 상태가 수렴한다. 실제 server store의 수용→ACK→검색 projection→재접속까지 성공하며 숨겨진 raw 중복이 없다. | planned / 미실행 |
| `AC-RD-122-04` | 기존 문서 호환 | 중복 snapshot·거절 outbox·구버전 client update를 포함한 fixture에서 원문을 보존하며 복구 뒤 추가 편집이 저장된다. validator 제거·outbox 삭제로 통과시키지 않는다. | planned / 미실행 |
| `AC-RD-122-05` | 변환 확인 | 확인 전 변경과 checkpoint await 중 변경을 각각 주입한다. await 뒤 원문/mode/version을 재검사해 stale preview를 거절하고 최신 원문을 유지한다. 중복 확인·unmount·회수·undo도 포함한다. | planned / 미실행 |
| `AC-RD-122-06` | 템플릿 전환 | 문장이 있는 템플릿의 형식/대상 변경은 즉시 비우지 않는다. 취소는 원문을 유지하며 확정은 손실 미리보기 또는 안전한 별도 초안 계약을 따른다. API에 없는 형식을 지원한다고 표시하지 않는다. | planned / 미실행 |

## 판정과 증거

각 항목마다 `source SHA / 시험 계층 / 환경 / 합성 fixture / 실행 명령 / 실패 전 결과 / 수정 뒤 결과 / 증거 위치 / 남은 실기기·외부 gate / 담당`을 기록한다. REPRODUCED나 재현 스크립트 exit 0은 결함 발생 증거이며 수정 PASS가 아니다.

실제 구현은 정상·빈·오류·권한 없음·offline·모바일 중 영향받는 상태를 포함한다. 단위 fixture, 실제 HTTP/DB, 브라우저, 물리 OS/AT, 공개 개발 smoke를 서로 대체하지 않는다. 개인정보 없는 합성 입력을 사용하며 비공개 원문 로그는 공개 계획에 복사하지 않는다.

## 중단·되돌림 기준

CRDT 원본·snapshot·기존 outbox와 구 클라이언트 update 호환을 먼저 고정한다. 포맷 변경 시 순방향 migration/호환 reader와 application rollback을 검증하고 불가역 변환은 별도 결정 전 실행하지 않는다. 서버 validator를 완화하거나 remote update를 버려 되돌리지 않는다.

원문 유실·거짓 저장·권한 확대·복구 불가가 확인되면 release blocker로 남긴다. 미실행 필수 검사를 PASS로 바꾸거나 후속 버전에 배정해 완료시키지 않는다. 실제 Phase 완료 절차는 공통 gate와 Agent.md를 함께 따른다.

## 비교 브랜치 추가 인수

아래 항목도 구현 완료 기준에 포함하며 현재는 모두 계획/미실행이다. 원격 PASS를 새 통합 SHA에 자동 승계하지 않는다.

- **[WC-02 — 자동 저장 timer·가사/공유 IME ChangeSet](../BRANCH-COMPARISON-118-P4.md)**: 조합 중 timer/flush/retry/dispose가 preedit를 확정 저장하지 않고 remote 내부 삽입·local undo가 보존되는지 확인한다. prompt 제목 잔존 문제와 별도 경로로 인수한다.

- **[WC-06 — prompt 부분 치환·IME 순서·변환 재검사](../BRANCH-COMPARISON-118-P4.md)**: ES-02/04 후보를 재사용하되 ES-03 제목, 치환 구간 내부 remote, 복수 update·실제 OS IME·변환 권한/undo 잔여를 인수한다.

- **[WC-09 — 템플릿 형식별 원문 draft](../BRANCH-COMPARISON-118-P4.md)**: 형식 왕복 원문과 locked fieldset을 인수하되 type/target/selection 전환 보호·UI-04/05는 별도로 구현한다.
