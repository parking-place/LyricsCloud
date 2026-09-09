# LyricsCloud 사고 기록 양식

창작물·검색어·이메일·resource ID·OAuth/session/DB secret을 기록하지 않는다. 아래 필드만 복사해 사용한다.

```text
incident_id:
severity: P0 | P1 | P2 | P3
environment:
started_at_utc:
detected_at_utc:
resolved_at_utc:
version:
build_sha:
schema:
affected_service:
route_template_or_operation:
anonymous_error_code:
request_id:
aggregate_metric_and_window:
user_impact_without_content:
initial_owner:
rollback_decision_owner:
actions_taken:
synthetic_recovery_probe:
volume_preservation_confirmed:
follow_up_issue:
```

복구 뒤 live/ready, version·SHA·schema, 합성 인증·저장·검색과 owner 격리를 확인한다. rollback이면 실패/직전/복구 digest와 시작·종료 시각만 추가한다.
