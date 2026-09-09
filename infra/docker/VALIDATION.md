# 0.0.0 Phase 4 검증 기록

- 검증일: 2026-09-04
- 환경: WSL2, 저장소 작업 경로
- 합성 설정만 사용했으며 실제 OAuth·세션·DB 비밀이나 사용자 본문은 사용하지 않았다.

## 통과

| 검증 | 결과 |
|---|---|
| Node.js 24.20.0 + pnpm 11.25.0 clean install | lockfile 기반 설치 성공 |
| `pnpm check` | workspace 8개 타입 검사와 architecture boundary 검사 성공 |
| `pnpm test` | 2 files, 4 tests 성공 |
| `pnpm build` | Next.js 16.3.4 standalone production build 성공 |
| Compose 정적 검증 | Docker Compose 5.5.1 `config --quiet` 성공, 서비스 5개·외부 web 포트 하나 확인 |
| Compose image·DB | Docker Desktop Engine 29.5.3에서 Node 24.20.0 image와 PostgreSQL 18.6 pull/build, 빈 volume 시작 성공 |
| migration | 최초 적용·재실행 성공, advisory lock/checksum 경계 확인, baseline 1건 기록 |
| health 정상·실패 구분 | 정상 DB에서 web liveness/readiness 200, 잘못된 DB 비밀번호에서 liveness 200/readiness 503 |
| 데이터 지속성 | 합성 probe가 web·worker·collaboration·PostgreSQL 재시작 뒤 유지됨 |
| 명시적 초기화 | 이번 검증에서 생성한 `lyricscloud_postgres_data`만 식별·제거 후 probe 부재와 baseline 재적용 확인 |
| 컨테이너 검사 | container 안에서 `pnpm check`, `pnpm test`, `NODE_ENV=production pnpm build` 성공 |
| 로그 redaction | PostgreSQL·migration·worker·collaboration 로그에서 합성 비밀번호·canary 0건 |
| PC·모바일 smoke | Playwright Chromium의 1440×1000, 390×844에서 15 route, 가로 overflow 없음, health 의미 확인 |
| 민감·runtime 파일 제외 | `.env*`, data, DB volume, backup, export, log 경로가 `.gitignore`에 의해 제외됨 |
| diff 형식 | `git diff --check` 성공 |

Smoke 캡처는 [`0.0.0-desktop.png`](../../docs/runbooks/evidence/0.0.0-desktop.png)와 [`0.0.0-mobile.png`](../../docs/runbooks/evidence/0.0.0-mobile.png)에 있다.

## 남은 차단 항목

Docker Desktop WSL integration 후 Engine/Compose는 정상 접근된다. 그러나 모든 host bind 주소와 포트에서 Docker Desktop 포워더가 다음 오류를 반환한다.

```text
ports are not available: exposing port TCP 127.0.0.1:3000 -> 127.0.0.1:0:
/forwards/expose returned unexpected status: 500
```

`127.0.0.1:3000`, `127.0.0.1:3100`, `0.0.0.0:3100`에서 동일했다. Windows 제외 포트 범위를 확인한 결과 `3000–3299`가 예약되어 있었고, 허용 포트 `32123`의 최소 nginx 공개는 성공했다. 저장소 기본 호스트 포트를 `8080`으로 변경했으며 container 내부 web 포트는 `3000`을 유지한다.

변경 후 `127.0.0.1:8080→3000` 포워딩, 외부 liveness/readiness 200, web health `healthy`를 확인하여 차단을 해소했다.

## 재개 명령

저장소 루트에서 다음을 실행한다.

```bash
docker version
docker compose config --quiet
docker compose up --build --wait
curl --fail http://localhost:8080/api/health/live
curl --fail http://localhost:8080/api/health/ready
docker compose ps
```

데이터 지속성과 명시적 초기화는 합성 probe로 검증했다. 검증 중 생성한 이전 DB volume은 정확한 Compose label을 확인한 뒤 제거했으며 새 baseline volume만 남겼다. 일반 작업에서 `docker compose down --volumes`는 사용자 확인 없이 실행하지 않는다.
