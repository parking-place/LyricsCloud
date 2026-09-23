# LyricsCloud 후속 패치 계획

> **2026-09-23 현재 순서:** [1.1.7b 웹 통합](../3.Redesign-phase/1.1.7.b/README.md) → 1.2.0 → 1.2.1~1.2.8. 이전 날짜의 직접 1.2.0 착수 안내는 이 순서로 대체하며 native 보류·완료 이력은 유지한다.

> 2026-09-22 후속 추가: **1.2.0 → [1.2.1~1.2.8](../3.Redesign-phase/ROADMAP.md)**. [0922 추적](../3.Redesign-phase/REVIEW-TRACEABILITY.md)과 [1.1.8 P4 웹 안정화 비교](../3.Redesign-phase/BRANCH-COMPARISON-118-P4.md)를 반영한 계획이며 제품 미착수·native 보류는 유지한다.

문서 상태: **1.1.8~1.1.14 후속 진행 보류**, 2026-09-22. 다음 제품 계획은 [3.Redesign-phase의 1.1.7b 웹 통합](../3.Redesign-phase/1.1.7.b/README.md)이며 그 인수 SHA에서 1.2.0 코발트 디자인을 시작한다. 기준은 `v1.1.7a`이며 보류된 플랫폼 작업을 선행조건으로 요구하지 않는다. [전환 결정](../3.Redesign-phase/PLAN-CHANGE.md)과 [계획 상태](STATUS.md)를 먼저 읽는다. 실제 실행 버전·Phase·완료 증거는 [실행 STATUS](<../1. Dev-phase/STATUS.md>) 한 곳을 따른다.

## 읽는 순서

[1.1.7.a 계획](1.1.7.a/README.md)은 제품 표기 `1.1.7a`의 기존 프로필/홈 이동 작업 이력이다. 그 완료 기록과 별도 개발선의 미완료 1.1.8 산출물을 보존한다. 아래 패치 문서는 기존 배정의 참고이며, 보류 표시를 무시하고 다음 Phase를 자동 착수하지 않는다.

1. [로드맵](ROADMAP.md) → [1.0.1 필수 범위](1.0.1/BRIEF.md) → [최신 요청 대응표](../../docs/planning/latest-requirements-mapping.md).
2. [버전 규칙](VERSIONING.md) → [요구 추적](Requirements-Traceability.md) → [결정 권한](Decision-Ownership.md).
3. 현재 버전 README·해당 Phase → 연결된 계약 → [품질 게이트](QUALITY-GATES.md)·[릴리스 정책](RELEASE-POLICY.md).
4. [문서 최신화](DOCUMENTATION-MAP.md)·[Codex 인계](CODEX-HANDOFF.md)·[규정 통합](GOVERNANCE-INTEGRATION.md)·[계획 검토표](REVIEW-CHECKLIST.md).
5. 모든 push 전 및 Phase 완료 때 [Future 검수](FUTURE-INTAKE.md). Future 계획은 저장소 어디에 두어도 발견/비교하며 고정 경로만 읽지 않는다.

## 배분과 보존

major는 사용자 명시 지시 전까지 **1 고정**이다. minor/patch는 다자리 정수이며 기본 정책은 다음 가용 patch 우선이다. 이번 1.2.0은 사용자 명시 지시로 배정한 리디자인 마일스톤이며 일반적인 minor 자동 상승 규칙을 만들지 않는다. 기본 5 Phase, 업무량·의존성이 크면 추가 허용, 1.0.1은 10 Phase다. 긴급 CLI는 P2이고 필수 베타 요구를 뒤 버전으로 미루지 않는다.

2026-09-09의 원래 배정 규모는 29개 버전·제품 Phase 150개·UX 설계 5단계·task 846개다. 이 숫자는 당시 계획 기록이며 현재 미발행/활성 작업 수가 아니다. 기존 730개 정의를 재사용했고, 변경한 미발행 번호·task 배정은 [개정 이력](../../docs/planning/plan-revision-2026-09-09.md)에 남겼다. 이미 발행된 버전·Git·migration/완료 이력은 변경하지 않는다. 숫자 채우기용 빈 Phase·릴리스를 만들지 않는다.

[Future_Feature](Future_Feature.md)의 129개 후보 ID·체크·설명·예시는 보존한다. 최신 필수 중복은 [이관표](../../docs/planning/mandatory-future-mapping.md)에 매핑해 다시 선택받지 않는다. 후보 체크는 검토 의사이며 구현 완료가 아니다. 원래 300개 배정 이력은 [기존 검토 기록](../../docs/planning/future-idea-scope.md)에 있다.

## 구현과 외부 결정

아래 P7~P10 설명은 2026-09-09 계획 패키지 당시의 인계 이력이다. 현재 다음 작업은 위 1.1.7b 선행 통합 계획이며 실제 완료 여부는 실행 STATUS와 각 버전 증거를 따른다.

NAVER 세 언어 사전 제공/권리·폰트별 라이선스/서브셋·Suno provider·후속 실제 OS/IME·UX 시안 선택·SDK/패키징은 해당 Phase gate로 남는다. P7에서 기존 제품 표식을 주 로고로 승인해 앱과 아이콘에 적용했고, P8은 새 계획 경로·가변 Phase·다자리 숫자와 dev/정식 Docker tag 분리를 구현했다. P9는 권한·동시성·복구 통합 인수를 완료했다. P10 정식 릴리스 전에는 이를 운영 완료로 안내하지 않는다.

원본 Sketch·Implementation-Stack·Mock-up과 기존 P6 이력을 보호한다. 원본 193파일/비공개 ZIP은 부모가 해시 일치를 확인했으나 재승인 삭제도 자동 검토에 거부돼 그대로 보존·commit 제외한다. 상세는 [인계](CODEX-HANDOFF.md)와 [출처](SOURCES.md)를 따른다.
