# Repository Agent Entry

이 저장소 전체에는 [`Agent.md`](./Agent.md)의 지침이 적용됩니다. 작업 전 반드시 해당 문서와 [`0.Plans/1. Dev-phase/STATUS.md`](<./0.Plans/1. Dev-phase/STATUS.md>)를 읽고, 현재 버전·Phase 범위만 수행하십시오.

Phase 완료는 검증·상태 문서 갱신, Phase 브랜치 commit·원격 push·CI 확인, 같은 SHA의 개발 서버 배포와 공개 smoke test까지 포함합니다. 직접 `main`이나 릴리스 서버에 반영하지 않으며 상세 순서는 `Agent.md`의 완료·GitHub 협업 규칙을 따릅니다.

일상 검증은 사용자 PC의 로컬 명령과 Docker를 사용합니다. 문서·중간 push는 `[skip ci]`로 원격 반복 실행을 피하고, 최종 통합·릴리스의 필수 CI와 미실행 항목은 `Agent.md` 9절에 따라 구분해 기록합니다.

더 가까운 경로에 별도의 `AGENTS.md`가 생기면 그 지침은 이 공통 지침을 좁히는 용도로만 사용하며 상위 기준을 무효화하지 않습니다.

모든 push 직전과 각 Phase 완료 때는 Agent.md의 Future 계획 검수 절차를 따른다. 후속 문서 계획은 [2.Patch-phase](./0.Plans/2.Patch-phase/README.md)에 있으며 실행 STATUS의 1.0.0 P6 review는 별도 실제 인수 전 유지한다.
