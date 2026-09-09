# LyricsCloud 후속 패치 계획

문서 상태: **검토 / 구현·배포 미실행**, 2026-09-09. 이번 작업은 기존 import를 이어서 최신 공동 작업 요구를 반영한 **1.0.1 P1 준비·인수 문서**다. 실행 상태는 [기존 STATUS](<../1. Dev-phase/STATUS.md>)의 `1.0.0 / 1.0.0/6phase.md / review`를 유지한다.

## 읽는 순서

1. [로드맵](ROADMAP.md) → [1.0.1 필수 범위](1.0.1/BRIEF.md) → [최신 요청 대응표](../../docs/planning/latest-requirements-mapping.md).
2. [버전 규칙](VERSIONING.md) → [요구 추적](Requirements-Traceability.md) → [결정 권한](Decision-Ownership.md).
3. 현재 버전 README·해당 Phase → 연결된 계약 → [품질 게이트](QUALITY-GATES.md)·[릴리스 정책](RELEASE-POLICY.md).
4. [문서 최신화](DOCUMENTATION-MAP.md)·[Codex 인계](CODEX-HANDOFF.md)·[규정 통합](GOVERNANCE-INTEGRATION.md)·[계획 검토표](REVIEW-CHECKLIST.md).
5. 모든 push 전 및 Phase 완료 때 [Future 검수](FUTURE-INTAKE.md). Future 계획은 저장소 어디에 두어도 발견/비교하며 고정 경로만 읽지 않는다.

## 배분과 보존

major는 사용자 명시 지시 전까지 **1 고정**이다. minor/patch는 다자리 정수이며 현재 제품 단계는 다음 가용 patch를 우선한다. 기본 5 Phase, 업무량·의존성이 크면 추가 허용, 1.0.1은 10 Phase다. 긴급 CLI는 P2이고 필수 베타 요구를 뒤 버전으로 미루지 않는다.

현재 29개 미발행 버전·제품 Phase 150개·UX 설계 5단계·task 846개다. 기존 730개 정의를 재사용했고, 변경한 미발행 번호·task 배정은 [개정 이력](../../docs/planning/plan-revision-2026-09-09.md)에 남겼다. 이미 발행된 버전·Git·migration/완료 이력은 변경하지 않는다. 숫자 채우기용 빈 Phase·릴리스를 만들지 않는다.

[Future_Feature](Future_Feature.md)의 129개 후보 ID·체크·설명·예시는 보존한다. 최신 필수 중복은 [이관표](../../docs/planning/mandatory-future-mapping.md)에 매핑해 다시 선택받지 않는다. 후보 체크는 검토 의사이며 구현 완료가 아니다. 원래 300개 배정 이력은 [기존 검토 기록](../../docs/planning/future-idea-scope.md)에 있다.

## 구현과 외부 결정

NAVER 세 언어 사전 제공/권리·폰트별 라이선스/서브셋·Suno provider·실제 OS/IME·약 5개 시안의 사용자 선택·SDK/패키징은 해당 Phase gate로 남는다. 새 목업/로고를 생성하거나 앱 구현·배포한 것은 아니다. `release-phase-state.mjs`의 1.0.0 P5/P6 전제를 새 경로·1.0.1·가변 Phase·다자리 숫자로 바꾸는 일은 P8의 실제 구현 과제다.

원본 Sketch·Implementation-Stack·Mock-up과 현재 P6 작업을 보호한다. 원본 193파일/비공개 ZIP은 부모가 해시 일치를 확인했으나 재승인 삭제도 자동 검토에 거부돼 그대로 보존·commit 제외한다. 상세는 [인계](CODEX-HANDOFF.md)와 [출처](SOURCES.md)를 따른다.
