# 3. Redesign-phase — 웹 통합·리디자인·후속 개선 계획

2026-09-23 사용자 지시로 **1.1.7b 웹 안정화 통합 → 1.2.0 Chroma Dock / Cobalt Blue 리디자인 → 1.2.1~1.2.8** 순서로 진행한다. 현재 제품 기준은 v1.1.7a이며, 먼저 1.1.8 웹 안정화의 코드·타입·호출자·회귀를 b에 통합하고 인수된 b SHA에서 디자인을 적용한다. 기존 네이티브 1.1.8~1.1.14 잔여 작업은 계속 보류한다.

1.2.0 다음의 **1.2.1~1.2.8**은 0922 리뷰와 최신 1.1.8 P4 웹 안정화 브랜치 비교를 바탕으로 배정했다. [버전별 로드맵](ROADMAP.md), [70개 리뷰 ID 추적](REVIEW-TRACEABILITY.md), [브랜치 비교·18개 선택 인수 후보](BRANCH-COMPARISON-118-P4.md)를 따른다. 후속은 41 Phase·205 작업이며 제품 구현은 모두 미착수다.

## 바로 보기

- **[먼저 진행할 1.1.7b 통합 계획](1.1.7.b/README.md)** — 5 Phase·42개 작업, 18 WC 통합·24개 수용 기준.
- [1.1.7b → 1.2.0 인계](1.1.7.b/HANDOFF-TO-1.2.0.md) · [정확한 b 버전 계약](1.1.7.b/VERSION-CONTRACT.md).

- [1.2.0 계획과 다섯 Phase](1.2.0/README.md)
- [선정 목업 — 코발트 블루 Chroma Dock](1.2.0/mockup/index.html)
- [디자인·색상·동작 기준](1.2.0/DESIGN-SPEC.md)
- [기존 기능 보존·수용 기준](1.2.0/ACCEPTANCE.md)
- [계획 상태](STATUS.md)
- [전환 결정과 보류 범위](PLAN-CHANGE.md)
- [이번 계획·목업 정리 검증](VERIFICATION.md)

## 상태의 의미

이 폴더는 다음 작업의 계획과 선택된 시안을 관리한다. **1.1.7b와 1.2.0 구현 Phase는 아직 시작하지 않았다.** 실행 버전·현재 Phase의 단일 원본은 계속 [개발 STATUS](<../1. Dev-phase/STATUS.md>)다. 목업의 로컬 시연 기능이나 문서 체크를 실제 서비스 구현·서버 인수·릴리스 완료로 해석하지 않는다.

`VERSION`, 패키지 버전, runtime metadata, DB migration, 기존 tag와 배포는 계획 정리만으로 바꾸지 않는다. 실제 P1 착수 때 기준 SHA와 작업 경계를 인수하고, 이후 각 Phase는 [Agent.md](../../Agent.md)의 검증·원격 CI·같은 SHA 개발 서버 인수 절차를 따른다.

기존 [2.Patch-phase](../2.Patch-phase/README.md)의 원본 계획·요구 ID·완료 증거와 [초기 목업](../Mock-up/README.md)은 보존한다. 선택한 코발트 목업은 필요한 코드·합성 자료·로컬 라이브러리를 이 폴더 안에 포함해 비공개 폴더 없이 열 수 있게 구성한다.
