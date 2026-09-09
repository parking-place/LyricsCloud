# LyricsCloud 개발 상태

```yaml
current_version: "1.0.1"
current_phase: "../2.Patch-phase/1.0.1/3phase.md"
state: "active"
owner: "Codex"
started_at: "2026-09-09"
updated_at: "2026-09-09"
next_action: "P3 환경별 HMAC test-user 이행·정규화·key rotation과 암호화 rollback 절차를 구현한다"
```

## 승인과 기준

2026-09-09 사용자가 1.0.1 계획의 모든 Phase 실행과 전체 완료 후 릴리스 서버 배포를 승인했다. `ADR-NF-001`, `PROD-NF-001`, `OPS-NF-001`의 권장 대안을 Accepted로 확정했다. 릴리스 서버 변경 권한은 P1~P10 완료와 최종 후보 검증 뒤에만 소비하며, 그 전에는 Phase별 개발 서버 인수만 수행한다.

사용자가 1.0.1 이전의 1.0.0 P6 안정화와 GitHub 반영을 승인했다. 착수 기준 SHA는 `9e362f60f183b6adedfe358554b077334645ed0c`, 당시 전용 브랜치는 `phase/1.0.0-p6-stabilization`이다. 2026-09-09 사용자가 PR #11을 P5에 병합하고 원격 P6 브랜치를 삭제했다. 현재 병합 기준 `7c3930b5bc2be4f25f8f7586b7ce3f02b039af99`는 후보 `405e535`와 동일 tree다. 후보 CI 통과와 별개로 병합 CI의 performance round CV 실패는 조사 중이며, [인수 출발점](../2.Patch-phase/CODEX-HANDOFF.md)에 증거를 연결했다. 운영 배포·정식 태그 재발행·다른 개발자의 작업 덮어쓰기는 승인에 포함하지 않는다.

## 기존 기록 보존

P5 당시 STATUS 전체는 [STATUS-1.0.0-P5.md](./STATUS-1.0.0-P5.md)에 **원본 blob `5492cb6eececa27ac9202eedb5aeb0a108f00286` 그대로** 보존했다. 모든 버전 진행표·승인·활성 작업 이력·완료 기록을 삭제하지 않고 같은 디렉터리로 옮겨 상대 링크를 유지한다. 현재 상태와 과거 증거를 분리하기 위한 변경이며 P1~P5 완료 기록을 소급 변경하지 않는다.

## 진행표

| 범위 | 상태 | 근거 |
|---|---|---|
| 0.0.0~1.0.0 P5 | 당시 완료 기록 보존 | 위 원본 STATUS와 기존 Phase 문서 |
| 1.0.0 P6 | review | 일부 코드 후보·격리 회귀, 전체 인수 미완료 |
| 1.0.1 P1 | 완료 | 사용자 재현·최초 손실 경계·베타/가입/릴리스 계약 확정 |
| 1.0.1 P2 | complete | `0900`·CLI·관리 컨테이너와 동일 SHA 개발 인수 완료 |
| 1.0.1 P3 | active | HMAC test-user 이행·정규화·key rotation |
| 1.0.1 P4~P10 | 미착수 | 앞 Phase 인수 뒤 순차 수행 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| Codex | 1.0.1/P3 | LC-NF-1.0.1-P3-01~03 | test-user reader/import·config·키 운영 runbook | P2 환경·키 계약 | 2026-09-09 | active |
| Codex | 1.0.1/P2 | LC-NF-1.0.1-P2-01~05 | 관리 CLI·auth/DB 코드 상태·설치 경로 | P1 Accepted 계약·PostgreSQL | 2026-09-09 | complete |
| Codex | 1.0.1/P1 | LC-NF-1.0.1-P1-01~08 | 계약·인수 문서, editor/auth/UI 원인 경로 | P6 회귀·실제 Windows IME·공개 개발 HTTPS | 2026-09-09T17:55:11+09:00 | complete |
| ChatGPT | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-04, LC-100-P6-05, LC-100-P6-06 | CI·scripts·backup·observability·export·settings·P6 문서 | 별도 DB/브라우저 및 원격 CI 검증 | 2026-09-09 | review |
| Codex | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-03, LC-100-P6-04, LC-100-P6-08 | CI·Compose·기동 검증·탈퇴 E2E·초안/PWA·P6 인계 문서 | Chromium/DB 회귀 및 로컬 5개 서비스 확인, 원격 CI·실제 환경 인수 | 2026-09-09 | review |
| Astra (astra_worker, 문서 단일 작성자) | 1.0.0/P6 인계·1.0.1 P1 준비 | LC-100-P6-08 | 0.Plans/2.Patch-phase·docs/adr/product/operations/planning·문서 색인·Agent/AGENTS | 문서 인계: 29버전·제품150 Phase+UX5·846 task·요구48, 원래730 task와 후보129 체크/설명/예시 보존. 문서 validator PASS(686 MD/15화면), 범위 링크/ID 검사 이상 없음. 원본 193파일/ZIP SHA256 일치는 부모 확인, 재승인 삭제도 자동 검토 blocked by policy로 거부되어 원본/백업 보존·commit 제외. 구현/원격 작업은 부모 인수 | 2026-09-09 | review |

## 인계

1.0.1 P1의 자동 P6 감사 100건과 개발 서버·공개 live/ready/auth 기준은 [P1 인수 기록](../../docs/runbooks/1.0.1-phase1-intake.md)에 연결했다. 사용자 PC의 기존 Compose는 healthy지만 앱 `0.7.0`·schema `0701_recent_searches.sql`로 오래되어 현재 결함 판정에서 제외했고, source 갱신 전 DB custom archive와 목록 판독을 확인했다. 사용자가 실제 Windows 입력·재진입 손실과 `+ 새 가사`·`연결 관리` 테마 오류 화면을 제출했다. 최초 손실 경계는 이탈 시 취소되는 지연 composition commit, 테마 원인은 정의되지 않은 `primary-button` selector로 판정했다. 전체 실제 입력 PASS는 P5, 양 테마·버튼 PASS는 P6에서 같은 후보 SHA로 닫는다.

[현재 Phase](./1.0.0/6phase.md), [검증 수준과 잔여 사항](../../docs/runbooks/1.0.0-phase6-stabilization.md)을 따른다. REVIEW-01~05·07·10의 초안·재시도·취소·템플릿·PWA 경로를 수정했으며 Chromium PC/모바일 회귀와 기존 복구 흐름을 확인했다. 전체 의미 기반 품질/성능/의존성 감사와 실제 기기 인수는 미완료다. 미해결 P0/P1을 0으로 선언하지 않는다.

사용자 요청에 따라 GitHub P6를 사용자 PC로 가져왔다. `.change`의 30개 경로/blob이 원격 후보와 일치함을 확인한 뒤 허가된 폴더만 삭제했다. 로컬 Docker 갱신은 기존 PostgreSQL 볼륨과 비공개 설정을 보존하며 DB 백업 후 진행한다. 공용 개발/운영 서버와 향후 버전 계획은 이번 PC 작업 대상이 아니다.

로컬은 `lyricscloud-local` 한 그룹의 postgres·web·collaboration·worker가 healthy이고 migrate가 exit 0이다. 임시 컨테이너는 제거했으며 live/ready·인증 화면·정적 asset·Google OAuth 시작을 확인했다. PC도 production 웹 빌드를 사용하며, 기존 HTTP OAuth 주소는 명시적인 loopback 전용 opt-in으로 유지한다. 공용/LAN origin은 여전히 HTTPS가 필수다. 실제 로그인 완료는 사용자가 기존 브라우저에서 확인한다.

P6 push 자동 발행은 차단하며 수동 candidate도 공용 tag를 변경하지 않는다. 기존 `v1.0.0`, release manifest, migration, lockfile은 보존한다. `OPS-100-001` 운영 외부 백업 미구축은 별도 승인·실제 복원 인수까지 계속 열려 있다.
