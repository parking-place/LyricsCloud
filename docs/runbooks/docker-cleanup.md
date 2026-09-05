# Docker 저장소 정리

LyricsCloud의 로컬 테스트와 개발·릴리스 배포에서 반복 build로 생기는 불필요한 Docker 객체를 안전하게 정리한다. 실행 중 서비스와 PostgreSQL·백업 volume은 보존한다.

## 표준 명령

대상을 먼저 확인한다.

```bash
./scripts/cleanup-docker.sh --dry-run --build-cache
```

테스트 또는 배포 검증이 성공한 뒤 정리한다.

```bash
./scripts/cleanup-docker.sh --build-cache
```

로컬에서는 `pnpm docker:cleanup`도 같은 명령을 실행한다. Compose project name을 바꾼 환경은 `--project <name>`을 명시한다.

## 삭제·보존 경계

| 구분 | 처리 |
|---|---|
| LyricsCloud 라벨의 중지 컨테이너 | 삭제 |
| LyricsCloud 라벨의 dangling image | 삭제 |
| LyricsCloud 라벨의 미사용 network | 삭제 |
| 현재 builder의 미사용 build cache | 모두 정리 |
| 실행 중 컨테이너와 사용 중 image | 보존 |
| PostgreSQL·백업·의존성 volume | 항상 보존 |
| 다른 Compose project의 컨테이너·image·network | 보존 |

BuildKit cache는 Docker builder 단위로 공유될 수 있다. 그래서 `--build-cache`는 모든 Docker build가 끝난 시점에만 사용하며, cache 삭제는 실행 결과에는 영향을 주지 않지만 다음 build 시간이 늘어날 수 있다.

## 환경별 원칙

- 로컬: Phase의 Docker 검증을 마친 뒤 실행한다.
- 개발 서버: `deploy-development.sh`가 서비스 health와 정적 asset 검증을 통과한 뒤 자동 실행한다.
- 릴리스 서버: 사용자가 현재 작업에서 릴리스 변경을 명시적으로 승인했고 배포 smoke test가 성공한 뒤 실행한다. 릴리스 배포 절차가 추가될 때 이 스크립트를 성공 경로의 마지막 단계에 연결한다.

정리 실패만으로 실행 중 배포를 제거하거나 volume을 prune하지 않는다. `docker system df`로 사용량과 회수 가능량을 확인하고 같은 정리 명령을 다시 실행한다.
