# Docker 개발환경

## 서비스와 노출

| 서비스 | 내부 포트 | 호스트 노출 | 책임 |
|---|---:|---:|---|
| web | 3000 | `127.0.0.1:${WEB_PORT:-8080}` | 중립 화면과 HTTP health |
| collaboration | 3001 | 없음 | 향후 인증 WebSocket, 현재 health |
| worker | 3002 | 없음 | 예약 작업 경계와 health |
| postgres | 5432 | 없음 | DB와 migration state |
| migrate | 없음 | 없음 | advisory lock 기반 SQL migration |

PostgreSQL은 `postgres_data`, 향후 암호화 backup은 `backup_data`, 의존성은 `workspace_node_modules`/`pnpm_store`에 분리한다. 소스 bind mount와 사용자 데이터 volume을 섞지 않는다.

## 시작·진단·종료

1. `.env.example`을 `.env`로 복사하고 모든 `CHANGE_ME`를 교체한다.
2. `docker compose config --quiet`으로 변수와 구성을 검사한다.
3. `docker compose up --build --wait`를 실행한다.
4. `http://localhost:8080/api/health/live`와 `/ready`가 각각 200인지 확인한다.
5. `docker compose down`은 컨테이너만 내리고 데이터는 보존한다.

`docker compose down --volumes`는 DB를 포함한 모든 개발 volume을 영구 제거하므로 일반 초기화 명령으로 제공하지 않는다. 명시적 초기화가 필요하면 대상 project가 `lyricscloud`인지 확인하고 backup 또는 disposable data임을 확인한 뒤 실행한다.

DB 비밀번호 오류나 DB 중단 시 app liveness는 200, readiness는 503이어야 한다. migration 파일을 적용 후 수정하면 checksum 검사가 시작을 거부한다.

## Windows·WSL 확인

- 저장소가 공백이 있는 Windows 경로에 있어도 `docker compose`를 저장소 루트에서 실행한다.
- Git은 `.gitattributes`에 따라 LF를 유지한다. editor 저장 후 container의 `pnpm check`로 CRLF 영향을 확인한다.
- Docker Desktop WSL integration을 활성화하고 bind mount 파일 감지가 늦으면 `WATCHPACK_POLLING=true`를 환경에 추가한다.

## 홈랩 이전 체크리스트

- `APP_ORIGIN`과 Google callback을 실제 HTTPS hostname으로 변경
- Caddy만 80/443 공개, web·collaboration·worker·PostgreSQL은 내부 network 유지
- Caddy, PostgreSQL, 암호화 backup volume을 서로 다른 명시적 host 경로에 배치
- trusted proxy, 방화벽, request limit, WebSocket upgrade와 장기 연결 검증
- 서버 시간대는 UTC를 유지하고 표시만 사용자 시간대로 변환
- 운영 secret manager 또는 host 전용 env 파일을 사용하고 파일 권한 제한
- 새 호스트에서 migration → readiness → WebSocket → backup/restore smoke 순서로 확인
