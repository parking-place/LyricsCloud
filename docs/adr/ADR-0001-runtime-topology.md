# ADR-0001 — 자체 운영 실행 토폴로지와 workspace

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-01-D, DEC-10-C

## 질문과 범위

로컬 Docker와 단일 홈랩 호스트에서 웹, 실시간 병합, 예약 작업, PostgreSQL을 어떻게 분리하고 같은 코드를 승격할 것인가. Kubernetes와 다중 리전은 제외한다.

## 대안

1. 단일 Next.js 프로세스: 단순하지만 WebSocket 수명과 worker 재시도가 웹 배포에 결합된다.
2. pnpm workspace의 `web`·`collaboration`·`worker` 분리: 장애·확장·권한 경계가 명확하다.
3. 실행 서비스 없이 정적 웹만 제공: 인증·DB·실시간 요구를 충족하지 못한다.

## 권고 결정

Node.js 24 LTS와 pnpm workspace를 사용한다. `apps/web`은 Next.js App Router standalone, `apps/collaboration`은 장기 WebSocket 프로세스, `apps/worker`는 예약·재시도 프로세스다. PostgreSQL과 Caddy는 별도 컨테이너이며 내부 네트워크에서만 앱 서비스에 연결한다. 로컬에서는 Caddy 없이 web 포트 하나만 선택적으로 노출하고 홈랩에서는 Caddy만 80/443을 노출한다.

도메인 패키지는 프레임워크를 import하지 않으며 web·collaboration·worker가 application port를 통해 호출한다. 이미지 하나를 환경 값만 바꿔 승격하고, 로컬 bind mount와 운영 immutable image를 분리한다.

## 검증·보안·철회

- web liveness와 DB 포함 readiness, collaboration liveness/readiness, worker heartbeat를 분리한다.
- 프로세스별 DB role과 최소 권한을 사용하고 브라우저에 DB를 노출하지 않는다.
- 단일 프로세스로 축소하려면 port 계약은 유지한 채 adapter를 합칠 수 있다. 반대로 수평 확장은 WebSocket 문서 라우팅과 cache 전략을 추가 ADR로 다룬다.

참고: Next.js 공식 self-hosting 지침은 reverse proxy 사용을 권장하고 standalone Docker 출력을 지원한다.
