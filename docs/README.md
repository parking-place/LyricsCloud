# Project documentation

기획 원본을 반복하지 않고 구현·운영 결정을 기록합니다.

- [`adr`](./adr/): 바꾸기 어려운 기술 선택과 대안·결과
- [`architecture`](./architecture/): 승인된 서비스 경계와 데이터 흐름
- [`data-model`](./data-model/): schema, 관계, 보존·복원 규칙
- [`product`](./product/): 자료 관계·삭제·복원 등 사용자 관점 제품 결정
- [`security`](./security/): 위협 모델, 인증·소유권·로그 규칙
- [`runbooks`](./runbooks/): 배포, migration, 백업·복원, 장애 대응
- [`operations`](./operations/): 운영 인수·릴리스 정책과 예외 기록
- [후속 아이디어 검토 이력](./planning/future-idea-scope.md): 통합·제외한 번호와 범위 근거

후속 구현의 작업 순서는 [계획 안내](../0.Plans/2.Patch-phase/README.md)를 따릅니다. 후보 129개는 [Future_Feature.md](../0.Plans/2.Patch-phase/Future_Feature.md)에 게시하며, 모든 push 전과 Phase 완료 때 저장소 전역 Future 파일의 실제 Git 변경을 [검수 인수 절차](../0.Plans/2.Patch-phase/FUTURE-INTAKE.md)에 따라 확인합니다. 새 `ADR-NF-*`·`PROD-NF-*`·`OPS-NF-*`는 [후속 결정 색인](../0.Plans/2.Patch-phase/Decision-Ownership.md)에 연결된 Proposed 문서이며 기존 Accepted 결정을 자동 대체하지 않습니다.

계획과 실제 구현이 달라지면 실제 구현을 숨기지 말고 ADR과 해당 Phase 인계에 차이를 기록합니다.

- [최신 공동 작업 요구 대응표](./planning/latest-requirements-mapping.md) · [필수/Future 이관](./planning/mandatory-future-mapping.md) · [계획 개정 이력](./planning/plan-revision-2026-09-09.md)
