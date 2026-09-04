# Shared packages

> 상태: `0.0.0`의 ADR 승인 전까지 변경 가능한 후보 구조입니다.

애플리케이션 사이에서 재사용하면서도 책임을 분리해야 하는 코드의 경계입니다. 실제 패키지 생성과 의존 방향은 `0.0.0`에서 workspace ADR과 함께 확정합니다.

- [`domain`](./domain/): 제품 용어, 상태, 검증 규칙, 권한 독립 규칙
- [`database`](./database/): schema, migration, transaction, 접근 경계
- [`editor`](./editor/): 순수 텍스트, 송폼 parser, CRDT adapter, 복사 범위 계산
- [`ui`](./ui/): 목업에서 추출한 토큰과 접근 가능한 공통 컴포넌트
- [`config`](./config/): TypeScript, lint, test 등 공유 설정
