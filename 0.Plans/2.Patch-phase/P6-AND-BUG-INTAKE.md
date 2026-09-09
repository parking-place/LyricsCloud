# P6·사용자 보고·기존 운영 backlog 인수표

이 표는 **최신 코드 재검토 결과가 아니라 인수 시 재판정할 목록**이다. 참고 원격은 7448f47이며 로컬 Codex의 추가 수정이 아직 반영되지 않았을 수 있다. 완료/미완료는 실제 최종 SHA·회귀 증거로 갱신한다.

2026-09-09 P6 PR #11은 P5에 병합됐으며 기준 `7c3930b`의 tree는 후보 `405e535`와 같다. 후보·병합 CI의 서로 다른 결과는 [현재 인수 출발점](CODEX-HANDOFF.md), 검증 범위는 [runbook](../../docs/runbooks/1.0.0-phase6-stabilization.md)을 따른다. 아래 REVIEW 표는 7448f47 시점의 목록이므로 현재 미해결 결함 수로 사용하지 않는다. 실제 기기·공개 HTTPS 등 잔여 인수를 먼저 대조한다.

## 사용자 보고 (1.0.1 최우선)

| ID | 보고 | 현재 증거 | 인수 기준 |
|---|---|---|---|
| BUG-101-IME | Windows에서 바라봐→바라보, 마냥→마냐, 마땅한→마ㄸㅎ | 사용자 라임 화면 관찰, 원인/다른 화면 미확인 | 실 OS IME 재현→원문 각 계층 대조→실기기 회귀. 원문 유실은 프로젝트 P0 후보로 분류 |
| BUG-101-CLICK | devlyrics의 dark mode·새 가사·연결 관리 클릭 불능 | 사용자 보고 | 정확한 배포 SHA/자산/JS/CSP/SW/권한/overlay 경계 비교, 실제 HTTPS 성공 |
| BUG-101-THEME | 일부 새 가사·연결 관리 등에 dark mode 미적용 | 사용자 보고 | portal 포함 CSS/토큰 전파, 양 테마·정상/오류 상태 회귀 |
| BUG-101-OVERLAP | UI 일부 겹침 | 사용자 보고, 화면별 목록 미완성 | 화면·viewport·zoom·키보드·stacking별 재현 기록 |
| BUG-101-SIDEBAR | 닫힌 좌측 sidebar icon 깨짐 | 사용자 보고 | 아이콘 렌더링·viewBox·폭·flex·focus·양 테마 확인 |

IME의 증상을 Unicode filter/자동 맞춤법으로 감추거나 실제 입력 대신 paste 테스트로 PASS 처리하지 않는다. UI 원인을 임의로 DNS로 설명하지 않는다.

## 이전 REVIEW 인수

| ID | 주제 | 참고 원격 시점의 처리 | 1.0.1에서 할 일 |
|---|---|---|---|
| REVIEW-01 | 다중 탭 pending 초안 삭제 | 미해결로 인계됨 | local Codex 수정·다중 초안/소비 ID 회귀 확인 |
| REVIEW-02 | 저장 중 후속 입력 초기화 | 미해결로 인계됨 | 응답 지연·추가 입력 원문 보존 확인 |
| REVIEW-03 | 응답 유실 후 같은 생성 ID payload 충돌 | 미해결로 인계됨 | 불변 생성 명령·영수증·중복 없는 회복 확인 |
| REVIEW-04 | 취소 dialog와 자동 생성 경쟁 | 미해결로 인계됨 | 타이머·이미 보낸 요청·폐기 조정 확인 |
| REVIEW-05 | 로컬 저장 실패인데 보존 안내 | 미해결로 인계됨 | IndexedDB 오류·메모리만 남은 상태 안내 확인 |
| REVIEW-06 | projection 지연 시 최신 export 누락 | 보수적인 실패 guard 후보 있음 | 실제 CRDT/ZIP·복구 가용성·사용자 retry 확인 |
| REVIEW-07 | PWA 재시작이 메모리 dirty 누락 | 미해결로 인계됨 | metadata·IME·local write·다중 탭 quiesce 확인 |
| REVIEW-08 | readable export 삭제 시각 누락 | Date 직렬화 후보 있음 | 실제 DB/ZIP·template·trash 일치 확인 |
| REVIEW-09 | 탈퇴 401 busy 고착 | busy/중복 submit/dialog 후보 있음 | 실제 focus·reauth·401·응답 유실·초안 보존 확인 |
| REVIEW-10 | template 재진입 시 초안 덮어쓰기 | 미해결로 인계됨 | 복구 우선·최초 적용1회·빈 배열 편집 보존 |
| REVIEW-11 | 실패한 백업 프로세스가 남의 lock 삭제 | 소유 lock 정리 후보 있음 | 실제 병렬 backup·종료·오류 회귀 |
| REVIEW-12 | 파일 없이 RPO 성공 | 실제 archive/hash 대조 후보 있음 | 실제 저장매체·I/O 비용·restore 인수 |
| REVIEW-13 | 빈 DB 정상 restore 거부 | 빈 데이터 허용 후보 있음 | 실제 빈 DB·기존 fixture·RLS/무결성 확인 |
| REVIEW-14 | routeTemplate 안전 로그 누락 | 정규화/allowlist 후보 있음 | 실제 telemetry·secret 차단·출력 동등성 |

추가 P6 후보: 탈퇴 응답 유실 후 session 401을 성공으로 잘못 해석해 로컬 자료를 지우는 경로, migration 임시 DB FORCE 종료 경쟁, projection 재시도 batch를 삭제 문서가 점유할 가능성. 앞의 두 항목에는 수정 후보가 있으나 후자의 정적 의심은 실제 재현 전에 확정 결함으로 세지 않는다.

## 기존 운영 항목

| ID | 인수 내용 | 닫는 증거 |
|---|---|---|
| OPS-100-001 | 운영 외부 암호화 backup·일일 timer·archive·restore 미구축 및 과거 사용자 유예 | 실제 구축·RPO 경보·분리 DB restore. 코드 수정만으로 해결 아님. release 전에 현재 예외 재승인 필요 |
| RC-091-001 | Yjs duplicate import 경고 | import graph·동일성·실제 IME/장문/복구 회귀. 경고 숨기기만 금지 |
| RC-100-001 | single replica in-memory limiter | scale-out 전 공유 제한 검증. 6자리 code 방어는 1.0.1에서 restart-safe 제한 별도 필요 |
| RC-091-002 | 실제 기기 PASS 상세 환경 미기록 | 기기·OS·브라우저/PWA·IME·망·정확한 SHA별 수용 증거 |

한글 유실이나 가입 인가처럼 핵심 위험은 다른 개선보다 먼저 처리한다. P6에서 이미 해결한 문제는 1.0.1에서 중복 재작성하지 않고 회귀 증거만 재사용 가능성을 확인한다. 원격/로컬 변경이 충돌하면 담당자 인수 후 병합하고 과거 패치를 덮어씌우지 않는다.
