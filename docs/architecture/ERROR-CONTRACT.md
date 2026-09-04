# 오류·health 계약

## 공개 오류

API 오류 응답은 HTTP 상태와 다음 두 필드만 공개한다.

```json
{"error":{"code":"DEPENDENCY_UNAVAILABLE","requestId":"opaque-request-id"}}
```

`code`는 클라이언트가 분기할 안정된 값이고 `requestId`는 서버 진단과 연결하는 불투명 식별자다. stack, SQL, 환경 값, OAuth code·token, 사용자 이메일과 창작물 본문은 응답에 포함하지 않는다. 인증·개인 데이터 API는 이후 Phase에서도 `apps/web/src/lib/http-response.ts`를 사용한다.

## Health

- liveness는 HTTP 프로세스가 요청을 받을 수 있는지만 확인한다.
- readiness는 PostgreSQL 연결과 현재 schema migration을 확인한다.
- 정상 응답은 app version, build ID, schema version을 제공한다.
- 장애 응답은 `CONFIG_INVALID`, `DATABASE_AUTH_FAILED`, `DATABASE_TIMEOUT`, `DATABASE_UNAVAILABLE`, `DATABASE_SCHEMA_OUTDATED`, `DATABASE_QUERY_FAILED` 중 하나만 제공한다.
- 모든 health와 인증 응답은 `Cache-Control: no-store`를 사용한다.

오류 분류에는 driver code만 사용하고 원본 driver message나 connection URL은 공개하지 않는다.
