# Infrastructure

> 상태: `0.0.0`의 ADR 승인 전까지 변경 가능한 후보 구조입니다.

Docker 자체 운영에 필요한 로컬·검증·운영 환경을 관리합니다.

- [`docker`](./docker/): 개발/검증/운영 compose, image, health check
- [`proxy`](./proxy/): TLS 종료, WebSocket upgrade, 보안 header
- [`backup`](./backup/): 매일 암호화 논리 백업과 독립 복원 훈련

실제 설정은 `0.0.0`의 토폴로지·프록시 ADR과 `0.9.1`의 운영 검증을 거쳐 추가합니다. DB 데이터와 백업 결과는 이 저장소에 저장하지 않습니다.
