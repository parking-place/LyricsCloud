# Observability

서버 오류·성능 신호만 기록하는 공통 경계다. 모든 transport 앞에서 고정 allowlist와 재귀 redaction을 적용하며 브라우저 자동 계측, session replay, 원문 URL/query/body/header 수집을 제공하지 않는다.

허용·금지 필드와 보존 정책은 [`docs/operations/OBSERVABILITY-DATA-CLASSIFICATION.md`](../../docs/operations/OBSERVABILITY-DATA-CLASSIFICATION.md), 경보 대응은 [`docs/runbooks/observability-alerts.md`](../../docs/runbooks/observability-alerts.md)를 따른다.
