# OPS-0003 — 자체 운영 성능 기준과 budget

- ID와 상태: `OPS-0003`, **Accepted**
- 결정 Phase와 승인자: 0.9.1 Phase 3, Codex가 계획의 완료 기준에 따라 수치화하고 자동 gate로 승인
- 관련 작업: `LC-091-P3-01`~`LC-091-P3-08`

## 해결할 질문과 범위

단일 가정용 서버에서 LyricsCloud의 핵심 목록·대시보드·검색·저장·revision·전체 export·수명주기 purge가 어느 데이터 규모와 동시성까지 출시 후보로 인정되는지를 고정한다. 실제 창작물, 운영 인증 값, 다중 애플리케이션 replica를 이용한 분산 rate limit은 범위 밖이다. Phase 2의 단일 replica rate limiter 제한은 그대로 유지한다.

## 기준 환경

기준 자체 운영 개발 서버는 Linux x86_64, 4 vCPU, 8 GiB RAM, Docker Engine 29.8.0/overlayfs, PostgreSQL 18.6이다. PostgreSQL은 `max_connections=100`, `shared_buffers=128MB`, `work_mem=4MB`, `effective_cache_size=4GB`이며 Compose 수준 CPU·메모리·PID hard limit는 두지 않는다. web·collaboration·worker·PostgreSQL 한 replica가 같은 Docker host에서 실행된다.

자동 gate는 그보다 작지 않은 Linux x86_64 runner에서 disposable `*_test` DB를 생성하고, 매 실행 뒤 DB만 제거한다. 네트워크 주소나 비밀 값은 결과에 쓰지 않는다. 공개 개발 배포는 정확히 같은 commit에서 live/ready, 인증 화면, 14개 보호 route 및 브라우저 smoke를 별도로 통과해야 한다.

## 합성 데이터와 부하

고정 데이터셋은 총 2,500개 resource(곡 500, 가사 1,500, 라임 250, 프롬프트 250), 일반 가사 본문 최대 4,000자, 10,000줄 장문 1개, purge 대상 자료 250개와 템플릿 100개다. 검색 희소어는 250번째 가사마다만 넣는다. 편집 동시성은 같은 owner의 PC 탭 2개와 모바일 1개, 저장 충돌 probe는 같은 row version을 가진 동시 write 2개로 정한다.

각 지표는 warm-up 뒤 7개 sample을 한 round로 하여 3 round, 총 21개 sample로 측정한다. p50·p95·오류율과 round별 p95 변동계수(CV)를 기록한다. 성능 fixture에는 결정론적 합성 문자열만 사용하고 보고서에는 본문 대신 건수·byte·SHA-256만 남긴다.

## 승인 budget

단위는 별도 표기가 없으면 밀리초다. `error rate`는 예상된 CAS conflict를 제외한 비정상 실패다.

| 흐름 | 통과 기준 |
|---|---:|
| 곡 목록 p95 | ≤ 150 ms |
| 곡 대시보드 p95 | ≤ 120 ms |
| 통합 검색 1~2글자 p95 | ≤ 180 ms |
| 통합 검색 일반어 p95 | ≤ 150 ms |
| 관계형 저장 p95 | ≤ 120 ms |
| 10,000줄 revision p95 | ≤ 160 ms |
| 전체 export | ≤ 5,000 ms, RSS 증가 ≤ 64 MiB |
| 250 resource+100 template purge | ≤ 2,000 ms |
| purge 중 검색 p95 | ≤ 250 ms, lock wait 0 |
| 10,000줄 송폼 parse / 전체 복사 p95 | ≤ 120 / 30 ms |
| 비정상 오류율 | 0% |
| 3 round p95 CV | 지표별 ≤ 75% |
| 24시간 가속 편집 소크 | 86,400 change event, RSS 증가 ≤ 48 MiB, 무음 손실 0 |

브라우저의 10,000줄 최초 조작 가능 시간은 기존 RC 기준인 10초 이하를 유지한다. 지연·단절·재연결·server restart는 저장 상태와 세 replica 수렴 시험으로 원문 fingerprint·중복·무음 손실 0을 확인한다.

## 검색 실행 계획 정책

`pg_trgm`은 3글자 미만 검색에서 선택도가 낮으므로 1~2글자는 sequential scan이 선택될 수 있다. 이를 오류로 간주하지 않고 별도 budget으로 제한한다. 일반 희소어는 default planner 선택과 `enable_seqscan=off`의 index-eligible probe를 함께 기록해 `lyrics_search_body_trgm_idx`가 사용 가능한지 확인한다. 작은 기준 데이터에서 default planner가 sequential scan을 더 싸게 판단하는 것은 p95 budget을 만족하면 허용한다.

## 검토한 대안과 선택 이유

- 운영 사용자 자료 복제: 대표성은 높지만 창작물 노출 위험 때문에 제외했다.
- 고정 wall-clock 한 번 측정: 변동과 회귀를 숨기므로 제외했다.
- 인프라 증설로 임계값 통과: 결함을 가리므로 제외했다.
- 결정론적 fixture+3 round+자동 실패: 재현성과 개인정보 보호를 함께 만족해 선택했다.

## 영향과 검증·되돌림

단일 원본은 [`config/performance-budgets.0913.json`](../../config/performance-budgets.0913.json)이며 CI, Phase 4 관측, Phase 5 RC, 1.0.0 gate가 소비한다. 수치를 완화하려면 새 OPS 결정을 만들고 이전/이후 수치와 원인을 남겨야 한다. 측정기가 불안정하면 gate를 재실행해 숨기지 말고 fixture, host contention, query plan을 분리 조사한다. 관련 결정은 `ADR-0005`, `ADR-0009`, `OPS-0001`이다.
