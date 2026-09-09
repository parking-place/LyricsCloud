# LyricsCloud 개발 상태

```yaml
current_version: "1.0.0"
current_phase: "1.0.0/6phase.md"
state: "review"
owner: "ChatGPT"
started_at: "2026-09-09"
updated_at: "2026-09-09"
next_action: "P6 후보의 원격 CI 결과를 PR에 인계하고, 실제 기기·OS IME·공개 HTTPS 및 남은 품질/운영 인수 항목을 확인한다"
```

## 승인과 기준

사용자가 1.0.1 이전의 1.0.0 P6 안정화와 GitHub 반영을 승인했다. 기준 SHA는 `9e362f60f183b6adedfe358554b077334645ed0c`, 전용 브랜치는 `phase/1.0.0-p6-stabilization`이다. 운영 배포·정식 태그 재발행·다른 개발자의 작업 덮어쓰기는 승인에 포함하지 않는다.

## 기존 기록 보존

P5 당시 STATUS 전체는 [STATUS-1.0.0-P5.md](./STATUS-1.0.0-P5.md)에 **원본 blob `5492cb6eececa27ac9202eedb5aeb0a108f00286` 그대로** 보존했다. 모든 버전 진행표·승인·활성 작업 이력·완료 기록을 삭제하지 않고 같은 디렉터리로 옮겨 상대 링크를 유지한다. 현재 상태와 과거 증거를 분리하기 위한 변경이며 P1~P5 완료 기록을 소급 변경하지 않는다.

## 진행표

| 범위 | 상태 | 근거 |
|---|---|---|
| 0.0.0~1.0.0 P5 | 당시 완료 기록 보존 | 위 원본 STATUS와 기존 Phase 문서 |
| 1.0.0 P6 | review | 일부 코드 후보·격리 회귀, 전체 인수 미완료 |
| 1.0.1+ | 미착수 | P6 미해결 항목과 기존 운영 backlog 인수 후 범위 결정 |

## 활성 작업

| 담당자 | 버전/Phase | 작업 ID | 수정 경로 | 의존성 | 시작 시각 | 상태 |
|---|---|---|---|---|---|---|
| ChatGPT | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-04, LC-100-P6-05, LC-100-P6-06 | CI·scripts·backup·observability·export·settings·P6 문서 | 별도 DB/브라우저 및 원격 CI 검증 | 2026-09-09 | review |
| Codex | 1.0.0/P6 | LC-100-P6-01, LC-100-P6-03, LC-100-P6-04, LC-100-P6-08 | CI·Compose·기동 검증·탈퇴 E2E·초안/PWA·P6 인계 문서 | Chromium/DB 회귀 및 로컬 5개 서비스 확인, 원격 CI·실제 환경 인수 | 2026-09-09 | review |

## 인계

[현재 Phase](./1.0.0/6phase.md), [검증 수준과 잔여 사항](../../docs/runbooks/1.0.0-phase6-stabilization.md)을 따른다. REVIEW-01~05·07·10의 초안·재시도·취소·템플릿·PWA 경로를 수정했으며 Chromium PC/모바일 회귀와 기존 복구 흐름을 확인했다. 전체 의미 기반 품질/성능/의존성 감사와 실제 기기 인수는 미완료다. 미해결 P0/P1을 0으로 선언하지 않는다.

사용자 요청에 따라 GitHub P6를 사용자 PC로 가져왔다. `.change`의 30개 경로/blob이 원격 후보와 일치함을 확인한 뒤 허가된 폴더만 삭제했다. 로컬 Docker 갱신은 기존 PostgreSQL 볼륨과 비공개 설정을 보존하며 DB 백업 후 진행한다. 공용 개발/운영 서버와 향후 버전 계획은 이번 PC 작업 대상이 아니다.

로컬은 `lyricscloud-local` 한 그룹의 postgres·web·collaboration·worker가 healthy이고 migrate가 exit 0이다. 임시 컨테이너는 제거했으며 live/ready·인증 화면·정적 asset·Google OAuth 시작을 확인했다. 운영 웹은 HTTPS가 필수이므로 PC의 기존 HTTP OAuth 주소는 웹 개발 모드로 사용한다. 실제 로그인 완료는 사용자가 기존 브라우저에서 확인한다.

P6 push 자동 발행은 차단하며 수동 candidate도 공용 tag를 변경하지 않는다. 기존 `v1.0.0`, release manifest, migration, lockfile은 보존한다. `OPS-100-001` 운영 외부 백업 미구축은 별도 승인·실제 복원 인수까지 계속 열려 있다.
