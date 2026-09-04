# Operational runbooks

재현 가능한 명령, 예상 출력, 실패 시 중단 기준, 복구·롤백 방법을 포함합니다.

1. 개발 환경 시작·종료
2. migration 적용·복구
3. 배포·rollback
4. 백업 생성·검증·별도 환경 복원
5. 탈퇴·휴지통 purge 작업 확인
6. CRDT 동기화 장애와 평문 투영 재구성
7. 비밀 회전과 보안 사고 대응

실제 명령은 관련 구성이 구현되고 검증된 버전에서만 추가합니다.

## 서버 공통 운영

- [`개발·릴리스 서버 기본 환경 구성`](./server-bootstrap.md)

## 완료된 기준선 검증

- [`0.0.0 기준선 통합 검증 보고서`](./0.0.0-release-readiness.md)
- [`0.0.0 Docker 검증 기록`](../../infra/docker/VALIDATION.md)
- [`0.1.0 Phase 1 검증`](./0.1.0-phase1-validation.md)
- [`0.1.0 Phase 2 검증`](./0.1.0-phase2-validation.md)
- [`0.1.0 Phase 3 검증`](./0.1.0-phase3-validation.md)
- [`0.1.0 Phase 5 통합 검증`](./0.1.0-phase5-validation.md)
- [`0.2.0 Phase 1 resource·song 데이터 모델 검증`](./0.2.0-phase1-validation.md)

## 개발 서버 운영

- [`검증된 Phase commit 배포`](./development-deploy.md)
- [`Cloudflare Tunnel과 HTTPS`](./cloudflare-tunnel-setup.md)
- [`Google OAuth 개발 설정`](./google-oauth-setup.md)

## 릴리스 서버 운영

- [`릴리스 서버 Cloudflare Tunnel과 HTTPS`](./release-cloudflare-tunnel-setup.md)
