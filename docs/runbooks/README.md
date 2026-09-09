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
- [`1.0 셀프호스팅 설치·설정`](../self-hosting.md)
- [`1.0 사용자 안내`](../user-guide.md)
- [`1.0 지원 정책과 알려진 제한`](../support.md)

## 완료된 기준선 검증

- [`0.0.0 기준선 통합 검증 보고서`](./0.0.0-release-readiness.md)
- [`0.0.0 Docker 검증 기록`](../../infra/docker/VALIDATION.md)
- [`0.1.0 Phase 1 검증`](./0.1.0-phase1-validation.md)
- [`0.1.0 Phase 2 검증`](./0.1.0-phase2-validation.md)
- [`0.1.0 Phase 3 검증`](./0.1.0-phase3-validation.md)
- [`0.1.0 Phase 5 통합 검증`](./0.1.0-phase5-validation.md)
- [`0.2.0 Phase 1 resource·song 데이터 모델 검증`](./0.2.0-phase1-validation.md)
- [`0.2.0 Phase 2 곡 CRUD·목록 검증`](./0.2.0-phase2-validation.md)
- [`0.3.0 Phase 1 가사 resource·CRUD 검증`](./0.3.0-phase1-validation.md)
- [`0.3.0 Phase 2 CodeMirror 편집기 검증`](./0.3.0-phase2-validation.md)
- [`0.3.0 Phase 3 송폼 인식·탐색 검증`](./0.3.0-phase3-validation.md)
- [`0.3.0 Phase 4 가사 복사·집중 모드 검증`](./0.3.0-phase4-validation.md)
- [`0.5.0 Phase 1 프롬프트 계약·데이터 모델 검증`](./0.5.0-phase1-validation.md)
- [`0.5.0 Phase 2 프롬프트 목록 검증`](./0.5.0-phase2-validation.md)
- [`0.5.0 Phase 3 프롬프트 편집기 검증`](./0.5.0-phase3-validation.md)
- [`0.5.0 Phase 4 프롬프트 순서·복사·곡 연결 검증`](./0.5.0-phase4-validation.md)
- [`0.5.0 Phase 5 프롬프트 통합 검증`](./0.5.0-phase5-validation.md)
- [`0.6.0 Phase 1 곡 대시보드 검증`](./0.6.0-phase1-validation.md)
- [`0.7.0 Phase 1 통합 검색 기반 검증`](./0.7.0-phase1-validation.md)
- [`0.7.0 Phase 2 검색 화면·딥링크 검증`](./0.7.0-phase2-validation.md)
- [`1.0.1 Phase 4 베타 가입 인수`](./1.0.1-phase4-beta-signup.md)
- [`0.7.0 Phase 3 최근 작업·위치 복원 검증`](./0.7.0-phase3-validation.md)

## 개발 서버 운영

- [`검증된 Phase commit 배포`](./development-deploy.md)
- [`암호화 backup·격리 restore·upgrade·rollback`](./backup-restore-upgrade.md)
- [`Docker 저장소 정리`](./docker-cleanup.md)
- [`Docker Hub versioned image 발행`](./dockerhub-publish.md)
- [`Cloudflare Tunnel과 HTTPS`](./cloudflare-tunnel-setup.md)
- [`Google OAuth 개발 설정`](./google-oauth-setup.md)

## 릴리스 서버 운영

- [`릴리스 서버 Cloudflare Tunnel과 HTTPS`](./release-cloudflare-tunnel-setup.md)
- [`1.0.0 Phase 3 production 배포 기록`](./1.0.0-phase3-deployment.md)
- [`1.0.0 Phase 4 문서·운영 인계 검증`](./1.0.0-phase4-validation.md)
- [`1.0.0 Phase 5 최종 릴리스·운영 인수`](./1.0.0-phase5-release.md)
- [`관측 경보 대응`](./observability-alerts.md)
- [`사고 기록 양식`](./incident-record-template.md)
- [`암호화 backup·격리 restore·upgrade·rollback`](./backup-restore-upgrade.md)
