# ADR-0009 — 본문 비수집 관측

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-11-A

## 대안

1. OpenTelemetry server SDK와 allowlist exporter: backend 교체가 쉽고 필드를 통제할 수 있다.
2. vendor SDK 자동 수집: 빠르지만 URL·payload·사용자 정보 누출 위험이 있다.
3. 관측 없음: 베타 장애 진단 요구를 충족하지 못한다.

## 권고 결정

서버에서 OpenTelemetry trace·metric API를 사용하되 초기에는 console 구조화 로그와 선택 가능한 OTLP exporter만 둔다. 브라우저 자동 계측과 session replay는 사용하지 않는다. telemetry attribute는 service, route template, method, status class, duration, anonymous error code, resource type만 allowlist한다.

제목, 본문, 태그, prompt token, 검색어, clipboard, CRDT payload, OAuth·session token, email, raw URL/query/body/header는 생성 단계에서 넣지 않는다. exporter 앞 redaction processor를 2차 방어로 둔다. resource ID가 필요하면 회전 가능한 환경별 HMAC 값만 제한적으로 사용한다.

## 검증·보안·철회

- 고유 합성 canary를 제목·본문·태그·검색어·token에 넣고 app log, Docker log, trace export 전체에서 0건인지 검사한다.
- 장애 재현에 필요한 최소 metric과 trace만 보존하고 retention·접근 권한은 운영 전에 확정한다.
- exporter를 끄면 제품 동작이 유지되어야 하며 backend 변경은 application code를 바꾸지 않는다.
