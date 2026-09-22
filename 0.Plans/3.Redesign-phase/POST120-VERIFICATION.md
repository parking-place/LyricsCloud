# 2026-09-22 후속 계획·브랜치 비교 검증

이번 작업은 0922 리뷰를 1.2.1~1.2.8 계획에 연결하고 새 원격 웹 안정화 브랜치와 비교한 **문서 작업**이다. 제품 구현·원격 후보 포팅·제품 Phase 완료 결과가 아니다.

## 구조·추적·보존

- 8개 후속 버전의 README·ACCEPTANCE와 41개 Phase, 고유 작업 ID 205개를 만들었다. 1.2.2는 6 Phase이며 나머지는 5 Phase다. 모든 제품 작업 체크는 미완료다.
- BE4/ES7/UI8/OPS3/M10/UX24/D14의 70 ID가 빠짐없이 담당 Phase와 연결된다. 번호가 없던 구조·측정·검증 제안 6개는 별도 RV-EX로 구분한다.
- 원격 웹 수정 후보 WC-01~18의 실제 소비 작업·남은 수용·의존성을 Phase와 수용표에 연결했다. WC-06은 P2 입력/IME와 P4 checkpoint 변환으로 분리했다.
- 신규·변경 Markdown의 로컬 링크, 버전별 Phase 수·작업 ID 유일성·미완료 상태·JSON 대응표·원격 근거 파일/행 범위를 확인한다. 최종 집계는 아래 검증 결과에 기록한다.
- 실행 STATUS의 current_version/current_phase/state는 기존 1.1.7a 완료, next_planned_version/phase는 1.2.0 P1을 유지한다. 새 활성 행은 계획 작업의 기록이다.
- 제품 apps/packages/infra/scripts/tests/config·VERSION/package/lockfile, 보호된 Sketch/Implementation-Stack/Mock-up, 선택 코발트 목업과 보류 native 1.1.8~1.1.14 원문은 변경하지 않았다.
- 읽은 비공개 리뷰 8개는 작업 시작 SHA-256과 대조한다. 리뷰·실행 로그·비공개 운영 정보는 Git에 추가하지 않는다.

## 비교와 독립 검수

[비교 문서](BRANCH-COMPARISON-118-P4.md)는 최신 원격 head c230c02와 기능 SHA0375825를 구별한다. 22개 원인의 정적 판정은 미변경14·부분대응5·해결후보3이다. 현재 제품에 통합하여 검증 완료한 항목은0이다. 원격 CI job 상태는 읽기 전용으로 확인했고 테스트 수/PC 인수는 해당 runbook 기록으로 명시했다. 최신 동일 SHA 원격 개발 배포·공개 smoke 미완료와 skipped release gate를 유지했다.

편집/백엔드, UI/UX, 운영 담당이 독립적으로 검수했다. 그 결과를 반영해 WC-06의 Phase 소유권, 재부팅 필수 인수, 검색의 실제 링크 focus 방식, 수신자 코드→grant→별도 링크 전달, server export와 미전송 초안/탈퇴 철회, UX-22와 ES-04의 다른 대상 참조를 보정했다. source에 없는 새로운 검색 widget이나 원문 손실의 출시 예외를 요구하지 않는다.

## 실행 범위·게시

문서 검사와 원격 조회만 수행했다. 앱 전체 검사·새 이미지 빌드·CI 재실행·브랜치 제품 적용·개발/릴리스 배포를 하지 않았다. 비교 원격에서 통과한 검사를 이번 계획의 제품 PASS로 기록하지 않는다.

이전 사용자 커밋·푸시 요청에 따라 같은 계획 branch `codex/1.2.0-redesign-plan`에 문서 변경을 `[skip ci]`로 게시한다. [Future 인수](../2.Patch-phase/FUTURE-INTAKE.md)는 hidden/tracked/untracked 탐색과 이전/원격 blob을 대조했고 129개 후보 변경은 없다. main·릴리스 branch·기존 tag는 이동하지 않는다.

## 최종 문서 검사

문서 86개에서 로컬 링크 1,234개를 확인했고 누락 링크는 0개다. 후속 41 Phase/205 고유 미완료 작업·70 리뷰 ID·18 WC 후보·22 원인 비교 분류와 원격 근거 파일/행 범위 검사가 통과했다. 실행/다음 계획 상태·제품/보호 경로·native 보류 문서·비공개 리뷰 8개 해시 보존도 통과했다. 신규/변경 문서의 공백 오류와 staged 경로를 확인해 계획/진입 문서만 게시 대상으로 확정한다. 제품 구현 미실행 상태는 유지한다.
