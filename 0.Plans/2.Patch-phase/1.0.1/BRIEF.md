# 1.0.1 필수 마감 배분

상태: 실행 중 / P1~P9 개발 인수 완료, P10 active. 사용자 필수 항목은 모두 1.0.1에서 인수한다. 1.0.2는 추가 사용 보완이며 필수 항목을 뒤로 미루지 않는다.

| Phase | 산출물·수용 |
|---|---|
| [P1](1phase.md) | P6 인수·IME/UI 재현·베타와 릴리스 계약 |
| [P2](2phase.md) | 긴급 관리자 베타코드 CLI·영속 상태 |
| [P3](3phase.md) | 해시 test-user 이행·정규화·키 회전 |
| [P4](4phase.md) | 코드와 메일 가입·검증된 Google identity 등록 |
| [P5](5phase.md) | Windows 한글 IME 수정·다른 입력 필드 보존 |
| [P6](6phase.md) | 공개 개발 UI 버튼·테마·겹침·사이드바 복구 |
| [P7](7phase.md) | 메인 로고·아이콘·버전과 Phase 표시 |
| [P8](8phase.md) | README·현재 문서·버전 및 릴리스 도구 대응 |
| [P9](9phase.md) | 권한·동시성·복구·잔여 P6 통합 인수 |
| [P10](10phase.md) | 전체 Phase 후보 인수·Private Beta 릴리스 인계 |

P1 계약→P2 긴급 CLI→P3 해시 test-user→P4 검증된 Google 가입→P5 실제 IME→P6 공개 UI→P7 브랜드→P8 README/도구→P9 통합→P10 후보 인수로 분리한다. P1에서는 코드 발급/상태/인가 계약을 우선 잠그며 CLI를 디자인 완료에 종속시키지 않는다. 심각한 데이터 손실은 P1에서 위험/사용 제한을 기록하고 승인된 수정 범위로 처리한다.

CLI는 `LyricsCloud betacode -n 7`, `ls`, `refresh`, 영숫자 6자리·CSPRNG·유일성·대량 한도·1회 소비·미사용만 폐기가 필수다. signup→코드+메일→Google 검증 성공→원자 앱 접근 등록 순서를 유지한다. 현재 평문 test-user, 목표 해시 이행, 앱 grant와 Google Console 정책을 구분한다.

로고 부근 `v1.0.1 Release` / `v1.1.12-p3 dev`, 라임/프롬프트 옆 버전 제거, 버튼/테마/겹침/sidebar 오류 복구와 README·현재 docs를 함께 인수한다. `release-phase-state.mjs`의 현행 1.0.0 P5/P6 전제는 P8 구현 과제이며 새 경로·가변 Phase·다자리 숫자를 이미 지원한다고 주장하지 않는다.

P1~P10 전체 인수 뒤 test-user 제한 Private Beta release를 판단한다. main은 release 때만 병합, 정식 `Release/latest/Release-latest`는 서비스별 동일 digest, 릴리스 서버는 현재 요청의 별도 명시 승인 후다. 실제 주소는 Git에 넣지 않고 `dev.example.test`/`app.example.test`와 `.private` 참조를 사용한다.

[요구 추적](../Requirements-Traceability.md) · [최신 요청 대응표](../../../docs/planning/latest-requirements-mapping.md) · [베타 계약](../contracts/BETA-ACCESS.md) · [변경 이력](../../../docs/planning/plan-revision-2026-09-09.md)
