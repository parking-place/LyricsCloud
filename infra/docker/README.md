# Docker boundary

웹, 실시간 동기화, worker, PostgreSQL의 build와 실행 구성을 둘 위치입니다. 서비스 수, image base, health check, volume, network는 승인된 ADR에 따라 정의합니다.

개발 compose와 운영 compose의 비밀·볼륨·노출 port를 명확히 분리합니다.

