# 관측 경보 대응 runbook

모든 경보는 [`observability-alerts.0914.json`](../../config/observability-alerts.0914.json)의 집계 임계값과 이 문서의 anchor를 함께 가져야 한다. 확인 과정에서도 제목·본문·검색어·사용자 식별자를 열람하거나 로그에 추가하지 않는다.

## 공통 확인 순서

1. 경보의 environment·version·build ID·service·metric·시간창만 확인한다.
2. 공개 live/ready, container health, DB readiness와 최근 배포 SHA를 대조한다.
3. 오류 code와 집계 건수만으로 영향 범위를 판단하고 canary가 아닌 실제 본문 조회를 금지한다.
4. 완화 뒤 같은 합성 probe로 정상화를 확인한다. 복구되지 않으면 운영 책임자에게 version·SHA·code·집계 수치·시작 시각만 전달한다.

## autosave-failure

- 사용자 영향: 저장 상태가 실패 또는 재시도로 남을 수 있다. 미전송 초안을 강제 새로고침하지 않는다.
- 확인: web·collaboration readiness, DB 연결, projection pending과 ACK 실패 집계를 차례로 확인한다.
- 완화: 신규 배포를 중단하고 건강한 기존 container 유지, DB 연결 복구, projection retry를 사용한다. 자료별 원문은 조회하지 않는다.
- escalation: 5분 실패율이 1% 초과로 두 시간창 지속하거나 무음 손실이 1건이면 P0으로 즉시 승격한다.

## search-latency

- 사용자 영향: 통합 검색 결과가 늦거나 timeout될 수 있다.
- 확인: 5분 p95, DB readiness, connection 사용량과 `pg_trgm` index 사용 가능 여부를 합성 query로 확인한다.
- 완화: 원문 query logging을 켜지 않고 느린 요청의 route template·duration만 비교한다. 150 ms 초과가 두 시간창 지속하면 배포를 중단한다.
- escalation: timeout/오류율 증가 또는 다른 핵심 route 지연과 동반되면 운영 책임자에게 전달한다.

## purge-failure

- 사용자 영향: 만료된 휴지통·탈퇴 자료의 정리가 늦어지지만 즉시 사용자 요청 경로를 재실행하지 않는다.
- 확인: worker readiness, 최근 `PURGE_FAILED` code, lifecycle run 상태와 lock wait 집계만 확인한다.
- 완화: 중복 실행을 만들지 말고 기존 멱등 worker의 다음 run 또는 승인된 단일 재시도를 사용한다.
- escalation: 15분 내 1건 이상이면 즉시 운영 책임자에게 알리고 30일/7일 삭제 기한 위반 가능성을 표시한다.

## backup-failure

- 사용자 영향: 현재 서비스는 계속 동작하지만 복구 지점 목표를 만족하지 못할 수 있다.
- 확인: backup job 상태·exit code·마지막 성공 시각·암호화 산출물 크기만 확인한다. dump 내용을 열거나 로그로 출력하지 않는다.
- 완화: Phase 5 backup runbook의 멱등 재시도와 별도 복원 검증을 수행한다.
- escalation: 15분 창에 1건 또는 RPO 초과 시 신규 릴리스 작업을 중단하고 운영 책임자에게 알린다.

## service-unavailable

- 사용자 영향: 로그인·편집·동기화·정리 중 하나 이상이 중단될 수 있다.
- 확인: 공개 live/ready → container health → DB readiness → 현재 checkout/BUILD_ID 순으로 확인한다.
- 완화: 장애 서비스만 재시작하고 데이터 volume은 유지한다. 배포 직후라면 검증된 직전 개발 SHA로 rollback을 준비한다.
- escalation: 60초 창에 1건이면 즉시 확인하며, 전체 서비스 불능·인증 우회·복원 불가는 P0이다.

## 관측 backend 장애

exporter/transport 실패는 제품 요청을 실패시키면 안 된다. endpoint를 비활성화해 console 집계만 유지하고 편집·저장·로그인 합성 smoke를 실행한다. transport 복구 전에도 원문 payload를 임시 파일이나 ad-hoc 로그로 남기지 않는다.
