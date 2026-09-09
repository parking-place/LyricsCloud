# 전 문서 최신화·이력 보존 매트릭스

'모든 문서 최신화'는 과거의 검증 사실을 현재 상태처럼 재작성하는 뜻이 아니다. 현재 운영/개발자가 따를 문서와 역사적 evidence를 구분한다. 아래 경로는 **수정 계획**이며 이 패키지는 기존 파일을 통째로 덮어쓰지 않는다.

| 문서군 | 1.0.1에서 반영할 것 | 보존할 것 | 책임 Phase |
|---|---|---|---|
| Agent.md / AGENTS.md | 새 계획 경로·활성 STATUS 인수·major 정책·main/release 규칙·hash allowlist | P6 담당/검증 경계와 데이터 보호 원칙 | P1 인수, P8 대조 |
| 새 README/ROADMAP/STATUS | 기본 5 Phase·1.0.1은 10 Phase·버전의 수용/제외·진행 증거 | 현재 계획/실행 상태 구분 | 각 Phase |
| 기존 1.Dev-phase/STATUS | P6 종료 인계와 새 활성 포인터 | 원문 완료/승인/배포 이력 | 담당자 인수 시 |
| root README.md | 로고·스크린샷·beta 동선·CLI·설치·문서 목차·실제 badge | 없는 성과를 꾸미지 않음, 이전 릴리스 링크 | P7~P10 |
| CHANGELOG.md / docs/releases | 실제 구현 변화·호환 영향·known limits | 기존 v1.0.0 release notes | P10/release |
| VERSION와 manifest 설명 | runtime/phase/channel·다자리 parser·제품 단계 전환에서만 minor/현재 세대의 기능 추가도 patch 우선·UX 비제품 번호 | 실제 코드 변경은 구현에서만 | P1/P8 |
| docs/adr / docs/product / docs/operations | 새 결정·승인/대체 관계·운영인수 | Accepted 과거 원문과 시점 | 최초 소비 Phase |
| .test_users.example / .env.example / config schema | hash 레코드 예제·secret 참조·code 보호·환경 분리 | 실제 메일/키/비밀번호 미포함 | P3/P9 |
| OAuth/허용계정 runbook | 앱grant와 Google 설정 분리·new account 검사·key 회전 | GoogleConsole 자동화 가능성 허위 주장 금지 | P1/P4/P8 |
| CLI install/운영/help | -n/ls/refresh·권한·출력 비밀성·실패 복구 | root 비밀/코드 로그 금지 | P2/P8 |
| DockerHub/개발배포/production runbook | dev numeric tag 금지·Release-latest·main release-only·digest | 기존 릴리스 immutable/서명 증거 | P1/P8/P10 |
| backup/restore/지원/incident | OPS-100-001 현재 상태·훈련·회수/응답 유실 | 과거 유예를 새 승인처럼 복사하지 않음 | P9/P10 |
| privacy/terms/security | beta 이메일·grant·초대코드·저장기간·외부 provider 설명 | 사용자 콘텐츠 무단 분석/전송 금지 | P4/P9 |
| UI/help/shortcut/성능 문서 | 실제 테마·아이콘·버전 위치·IME 수용·지원기기 | 과거 모사 결과를 실제 기기로 승격하지 않음 | P7~P10 |
| scripts의 문서 validator | 새 경로/다자리version/가변 phase/정책/기존이력 읽기 | 기존 release evidence assertion 삭제로 우회 금지 | P1/P8 |
| Sketch/Mock-up/Stack 원본 | 새 범위 문서로 명시적 후속 링크를 제안 | 기본적으로 원문 수정/이동/삭제 없음 | 변경 필요 시 별도 승인 |

## 예쁜 README의 구성 계약

브랜드 header(승인 logo) → 한 문장 소개와 **Private Beta** 안내 → 핵심 기능/실제 화면 → 빠른 설치 → 기존 로그인/초대 가입 → 관리자 CLI → 문서 지도 → 테스트/기여 → 개인정보/백업/known limits → license·지원. badge는 실제 workflow와 release를 가리키고 로드맵 기능은 구현 기능과 분리한다. 이미지에는 합성 자료만 사용한다. 라이트/다크에서 읽히는 자산과 대체 텍스트를 제공한다. logo 이름 노출을 위한 Google Brand Verification도 scope/프로젝트에 맞게 별도 확인한다.

## 전수 정리 방법

Git tracked 문서를 목록화해 current/reference/archive/proposed로 분류하고 각 파일의 소유 Phase·마지막 검토 SHA·바뀔 계약·링크 상태를 기록한다. 현재 문서의 상대 링크·예제 명령·환경/권한·version/phase/channel·alias 표기를 검증한다. 과거 완료 파일에는 당시 사실을 유지하고 필요할 때 '현재 정책은 새 문서 참조'라는 비파괴 링크를 붙인다. 승인 없이는 과거 checklist를 다시 체크/해제하지 않는다.

패키지 내 링크 검사는 문서 간 구조의 일치만 확인한다. 실제 root README와 기존 runbook의 최신화 완료는 1.0.1 P8~P10 구현 작업의 산출물이다.

현재 문서 정비는 Agent/색인/계획/요구추적과 필요한 OAuth 현행 안내만 직접 수정했다. 실제 CLI·해시·release-phase-state 지원과 로고/스크린샷의 제품 최신화는 구현 Phase에서 증거와 함께 적용한다.
