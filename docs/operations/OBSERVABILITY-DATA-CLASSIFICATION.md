# 관측 데이터 분류와 보존 정책

- 기준: Accepted [`ADR-0009`](../adr/ADR-0009-observability.md), DEC-11-A
- 적용 범위: web·collaboration·worker·database·migration·backup의 서버 오류·성능·운영 신호
- 비적용 범위: 브라우저 자동 계측, session replay, 페이지뷰·클릭·검색어 분석

## 허용 필드

transport로 전달할 수 있는 필드는 `packages/observability/src/index.ts`의 `TELEMETRY_ALLOWED_FIELDS`만 단일 원본으로 삼는다.

| 분류 | 허용 값 | 제한 |
|---|---|---|
| 배포 문맥 | `service`, `environment`, `version`, `buildId` | 안전한 고정 식별자만 허용 |
| 상관관계 | `requestId` | 서버 생성 불투명 ID, 개인·resource ID로 사용 금지 |
| 요청 집계 | `routeTemplate`, `method`, `statusClass`, `durationMs` | raw URL·query·동적 ID 금지 |
| 오류 | `errorCode`, `outcome`, `operation` | 안정된 익명 code만 허용, message·stack 금지 |
| 성능·운영 | `metric`, `value`, `unit`, `count`, `threshold` | 서비스·시간창 단위 집계만 허용 |
| 경보 | `alert`, `severity`, `runbook` | repository 내부 runbook 상대 경로만 허용 |
| 자료 유형 | `resourceType` | song·lyric·rhyme·prompt·template 등 유형만 허용 |

## 절대 금지

제목·가사·메모·태그·라임·프롬프트·템플릿 본문, 검색어, clipboard, CRDT payload/snapshot, 원문 URL/query, breadcrumb, DOM snapshot, request/response body·header, cookie·Authorization, OAuth code/access/refresh token·PKCE, 이메일과 사용자·계정·resource/document ID를 수집하지 않는다. Error의 `message`, `stack`, 중첩 `cause`도 transport에 전달하지 않는다.

고정 allowlist에 없는 필드는 버리고, 그 전에 재귀 redaction으로 금지 key와 secret 형태 문자열을 치환한다. 허용 필드에 원문을 넣으려는 경우에도 형식·enum 검사가 실패해 제거된다. 브라우저 bundle에는 관측 SDK와 transport를 넣지 않는다.

## 접근·보존·삭제

- console JSON은 Docker runtime의 제한된 운영 로그로만 남기며 개발 환경은 최대 5개×10 MiB 순환 보존을 적용한다.
- 선택 가능한 OTLP backend를 연결할 경우 trace/log는 7일, 집계 metric은 30일, 경보 발생·해제 상태는 90일 이내로 제한한다. 더 긴 보존은 새 OPS 승인 없이는 금지한다.
- 접근은 개발/릴리스 서버 운영자와 명시된 incident 담당자에게만 최소 권한으로 부여한다. 애플리케이션 사용자와 일반 인증 계정에는 관측 endpoint·dashboard 권한을 주지 않는다.
- 기간 만료는 backend TTL과 Docker log rotation으로 자동 삭제한다. incident export는 만들지 않으며, 임시 조사 자료는 종료 즉시 삭제한다.
- backend·저장 지역은 이 Phase에서 고정하지 않는다. OTLP endpoint가 없으면 제품 기능은 console transport만 사용하며 exporter 장애는 항상 fail-open이다.
- backup·restore·rollback도 생성 시각, ciphertext 크기, checksum 통과 여부, duration, 보존 삭제 건수만 기록한다. archive 이름·DB 이름·storage 경로·key 식별자·복원된 행 내용은 기록하지 않는다.

## 대시보드 제한

[`observability-dashboard.0914.json`](../../config/observability-dashboard.0914.json)은 서비스·시간창 집계만 표시한다. request ID는 단일 장애 상관 확인에만 쓰고 dashboard dimension이나 사용자 여정으로 묶지 않는다. 개인별 생성·수정·검색·열람 행동을 재구성할 수 있는 panel과 drill-down은 금지한다.
