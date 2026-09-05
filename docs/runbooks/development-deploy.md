# 개발 서버 배포

검증된 Phase commit을 공개 개발 주소에서 실제로 시험할 수 있게 만드는 표준 절차다. 서버 주소·계정·배포 경로와 secret은 Git에서 제외된 `.private/` 문서를 단일 원본으로 사용한다. 이 절차는 개발 서버만 대상으로 하며 릴리스 서버에는 적용하지 않는다.

## 완료 순서

1. 현재 Phase의 로컬 수용 테스트와 migration 복구 검사를 통과한다.
2. Phase 브랜치에 commit하고 원격 branch SHA 일치를 확인한다.
3. 그 SHA의 필수 GitHub Actions가 모두 통과했는지 확인한다.
4. 개발 서버 checkout에 tracked 변경이 없는지 확인한다.
5. 원격 branch와 전달받은 전체 SHA가 일치할 때만 해당 SHA로 전환한다.
6. 환경 파일의 secret을 유지하고 `BUILD_ID`만 목표 SHA로 갱신한 뒤 서버 전용 Compose override로 production web image build, forward migration, Compose 갱신을 실행한다.
7. web이 `NODE_ENV=production`이고 HTML에 개발 HMR client가 없으며 같은 image의 CSS에 현재 곡 화면 selector가 포함되는지 확인한다.
8. 네 컨테이너 health를 확인한 뒤 LyricsCloud의 중지 컨테이너·dangling image·미사용 network와 현재 builder의 미사용 cache를 정리한다. volume은 정리하지 않는다.
9. 공개 HTTPS live·ready와 변경 기능 smoke test를 확인한다.
10. 배포 SHA·시각·검증 결과를 로컬 서버 인벤토리에 기록한다.

## 최초 준비

- 배포 전용 checkout은 다른 저장소와 섞이지 않는 개발 서버 경로에 둔다.
- Git remote는 read-only 접근으로 충분하다. 서버에서 commit하거나 merge하지 않는다.
- `.env`와 `.test_users`는 mode `600`으로 만들고 Git·Docker build context에 넣지 않는다.
- [`compose.development-server.yaml`](../../compose.development-server.yaml)은 host source·dependency mount를 제거한다. 실행 컨테이너는 checkout을 직접 수정하거나 checkout 전환 중인 코드를 미리 읽지 않고, build된 정확한 commit 내용만 사용한다.
- 공개 개발 web은 `infra/docker/Dockerfile.web`의 Next.js production standalone image로 실행한다. `next dev`는 배포마다 같은 정적 asset URL을 재사용할 수 있어 Cloudflare·브라우저 cache와 최신 HTML이 불일치하므로 서버 배포에 사용하지 않는다.
- 개발 OAuth client의 JavaScript origin과 callback은 개발 공개 주소와 정확히 일치해야 한다.
- `POSTGRES_PASSWORD`, `SESSION_SECRET`, OAuth secret과 허용 메일 값은 터미널 출력이나 명령행 인수로 전달하지 않는다.

## 배포 명령

로컬 Agent는 `.private` 인벤토리에서 개발 서버만 선택해 SSH로 접속하고, 서버 checkout 안에서 다음 스크립트를 실행한다. 브랜치와 SHA는 secret이 아니지만 축약 SHA는 허용하지 않는다.

```bash
./scripts/deploy-development.sh phase/<version>-<phase> <40-character-commit-sha>
```

스크립트는 다음 경우 변경 전에 중단한다.

- tracked server checkout이 dirty인 경우
- 원격 branch SHA와 요청 SHA가 다른 경우
- `.env` 또는 `.test_users`가 비어 있는 경우
- Compose 설정 검증이 실패한 경우

서비스 health와 정적 asset 검증 뒤 실행되는 Docker 정리가 실패하면 exit 12로 종료한다. 이 경우 새 앱은 이미 실행 중일 수 있으므로 배포 자체를 되돌리지 않고 디스크 여유와 Docker daemon 상태를 확인한 뒤 정리만 재시도한다.

## 공개 검증

컨테이너가 healthy가 된 뒤 개발 공개 주소에서 다음을 확인한다.

```text
GET /api/health/live  -> 200
GET /api/health/ready -> 200, database schema version 포함
GET /auth             -> 200
```

live·ready 응답의 `build.id`는 배포를 요청한 전체 SHA와 정확히 같아야 한다. 단순히 컨테이너가 healthy인 것만으로 배포를 완료 처리하지 않는다. HTML에 `browser_dev_hmr-client`가 있거나 image 내부 CSS에 현재 화면 selector가 없으면 정적 자산 불일치로 보고 배포를 실패시킨다.

화면 Phase는 PC와 모바일 viewport에서 변경 흐름을 실행한다. 인증·세션 또는 OAuth 설정을 바꾼 Phase는 시크릿 창에서 허용 계정 로그인·callback·로그아웃까지 확인한다. DB Phase는 ready 응답의 schema version과 Phase 통합 테스트를 함께 증거로 남긴다.

## 실패와 rollback

- build 전에 실패하면 기존 컨테이너를 유지하고 원인을 수정한 뒤 같은 SHA로 재시도한다.
- migration 전에 실패하면 DB를 변경하지 않는다.
- migration 뒤 앱 health가 실패하면 로그에서 비밀과 사용자 본문을 제외한 오류 코드만 확인한다.
- schema가 이전 코드와 호환되는 경우 스크립트에 이전 검증 SHA를 전달해 앱을 되돌린다.
- 비호환 또는 destructive migration은 자동 down하지 않는다. 백업 복원이나 forward 보정 migration 계획을 먼저 승인받는다.
- 실패 상태에서도 릴리스 서버를 대체 시험 대상으로 사용하지 않는다.
