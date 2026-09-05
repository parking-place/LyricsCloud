# Scripts

개발·검증·운영에서 반복 실행할 수 있는 작은 명령을 둡니다. 스크립트는 명시적인 대상과 dry-run 또는 확인 가능한 출력을 제공해야 합니다.

운영 데이터 삭제, migration, 백업 정리처럼 파괴적인 동작은 기본 동작으로 두지 않으며 runbook과 별도 승인을 요구합니다.

현재 의존성 없이 실행할 수 있는 검사:

```powershell
powershell -NoProfile -File scripts/validate-plans.ps1
```

이 검사는 다음 계획 무결성을 확인합니다.

- 13개 버전과 각 버전의 정확히 `1phase.md`~`5phase.md`, 전체 65개 Phase 문서 존재 여부
- 각 Phase 제목의 버전·Phase 번호, 레벨 2 구역 수, 버전·Phase 형식에 맞는 작업 ID 6개 이상과 전체 작업 ID 중복 여부
- `Implementation-Stack.md`의 `DEC-01`~`DEC-13`별 정확히 하나의 선택과 `FINAL-APPROVAL`
- `STATUS.md`의 `current_version`·`current_phase` 형식과 해당 Phase 파일 존재 여부
- `docs/adr/README.md`와 `STATUS.md`에 기록된 ADR ID 집합의 일치 여부
- `Requirements-Traceability.md` 존재 여부와 상세 요구사항 표 첫 열의 `REQ-*` ID 중복 및 §49 기준 영역별 개수(계정 5, 곡 11, 가사 17, 라임 10, 프롬프트 14, 공통 14)
- 저장소 내 Markdown 로컬 링크 대상의 존재 여부

이 검사는 문서 문장의 의미, 요구사항과 구현의 실제 동작 일치, 외부 URL·Markdown 앵커 유효성까지 증명하지는 않습니다.

## 허용 메일 파일 이관

이전 설정의 `.env` `AUTH_ALLOWED_EMAILS` 값을 현재 환경의 `.test_users`로 값 노출 없이 이관한다.

```bash
node scripts/migrate-test-users.mjs
```

스크립트는 기존 `.test_users` 항목과 병합·정규화한 뒤 `.env`에서 `AUTH_ALLOWED_EMAILS` 행을 제거한다. 두 파일 권한은 `600`으로 맞추며 실제 이메일은 출력하지 않는다.

## Docker 정리

로컬·개발·릴리스 환경에서 LyricsCloud 빌드와 검증이 성공한 뒤 불필요한 Docker 객체를 정리한다.

```bash
pnpm docker:cleanup
# 또는
./scripts/cleanup-docker.sh --build-cache
```

기본 정리 대상은 `com.docker.compose.project=lyricscloud` 라벨이 있는 중지 컨테이너, 미사용 image와 network다. 별도 Compose project name으로 테스트했다면 `--project <name>`으로 각각 실행한다. `--build-cache`는 여러 프로젝트가 공유할 수 있는 현재 builder의 미사용 cache를 모두 정리하므로 Docker 빌드를 모두 마친 뒤 사용한다. volume, 실행 중 컨테이너, 사용 중 image는 삭제하지 않는다. 삭제 전 대상만 확인하려면 `--dry-run`을 추가한다.

## Docker image tag

Docker Hub tag를 Git ref와 현재 `VERSION`으로 계산한다.

```bash
./scripts/docker-image-tag.sh branch phase/0.2.0-p5-song-dashboard <40-character-commit-sha>
./scripts/docker-image-tag.sh tag v0.2.0 <40-character-commit-sha>
```

branch는 `<version>-dev.<12자리 SHA>`, 정확한 release Git tag는 `<version>`을 출력한다. `VERSION`과 `STATUS.md`의 현재 버전이 다르거나 tag·SHA가 잘못되면 실패한다.
