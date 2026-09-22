# 3. Redesign-phase — 리디자인 계획

2026-09-22 사용자 지시로 다음 제품 계획을 **1.2.0 · Chroma Dock / Cobalt Blue**로 지정했다. 계획 기준은 `v1.1.7a`다. 기존 패치 계획 **1.1.8~1.1.14는 보류**하며, 그 버전들의 구현·발행을 1.2.0의 선행조건으로 요구하지 않는다.

## 바로 보기

- [1.2.0 계획과 다섯 Phase](1.2.0/README.md)
- [선정 목업 — 코발트 블루 Chroma Dock](1.2.0/mockup/index.html)
- [디자인·색상·동작 기준](1.2.0/DESIGN-SPEC.md)
- [기존 기능 보존·수용 기준](1.2.0/ACCEPTANCE.md)
- [계획 상태](STATUS.md)
- [전환 결정과 보류 범위](PLAN-CHANGE.md)
- [이번 계획·목업 정리 검증](VERIFICATION.md)

## 상태의 의미

이 폴더는 다음 작업의 계획과 선택된 시안을 관리한다. **1.2.0 구현 Phase는 아직 시작하지 않았다.** 실행 버전·현재 Phase의 단일 원본은 계속 [개발 STATUS](<../1. Dev-phase/STATUS.md>)다. 목업의 로컬 시연 기능이나 문서 체크를 실제 서비스 구현·서버 인수·릴리스 완료로 해석하지 않는다.

`VERSION`, 패키지 버전, runtime metadata, DB migration, 기존 tag와 배포는 계획 정리만으로 바꾸지 않는다. 실제 P1 착수 때 기준 SHA와 작업 경계를 인수하고, 이후 각 Phase는 [Agent.md](../../Agent.md)의 검증·원격 CI·같은 SHA 개발 서버 인수 절차를 따른다.

기존 [2.Patch-phase](../2.Patch-phase/README.md)의 원본 계획·요구 ID·완료 증거와 [초기 목업](../Mock-up/README.md)은 보존한다. 선택한 코발트 목업은 필요한 코드·합성 자료·로컬 라이브러리를 이 폴더 안에 포함해 비공개 폴더 없이 열 수 있게 구성한다.
