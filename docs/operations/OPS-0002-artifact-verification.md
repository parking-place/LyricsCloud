# OPS-0002 — 배포 image 서명·provenance·digest 승인 계약

- ID와 상태: `OPS-0002`, **Accepted**
- 결정 Phase와 승인자: 0.9.1 Phase 5, Codex가 계획의 완료 기준과 CI 실증에 따라 승인
- 관련 작업: `LC-091-P5-07`~`LC-091-P5-10`

## 해결할 질문과 범위

1.0.0 배포 후보가 어떤 source commit과 Dockerfile target에서 만들어졌는지, 누가 만든 artifact인지, 어떤 불변 식별자를 승인하고 배포해야 하는지 고정한다. 대상은 `web`, `collaboration`, `worker`, `migrate` 네 application image다. registry 계정 운영, Docker Hub 자체 가용성, 호스트 OS 공급망은 범위 밖이다.

## 선택

- registry는 기존 승인 경계인 Docker Hub의 `parkingplace/lyricscloud-{web,collaboration,worker,migrate}` 네 repository를 유지한다.
- GitHub Actions의 `.github/workflows/ci.yml`만 image를 발행한다. 전체 `verify` job을 통과한 동일 SHA에서 BuildKit `mode=max` SLSA provenance와 SBOM을 붙인다.
- 장기 signing key를 만들지 않는다. GitHub Actions OIDC와 Sigstore Fulcio/Rekor를 사용하는 keyless `cosign`으로 `repository@sha256:digest`를 서명한다.
- certificate identity는 `https://github.com/parking-place/LyricsCloud/.github/workflows/ci.yml@<Git ref>`, issuer는 `https://token.actions.githubusercontent.com`와 정확히 일치해야 한다.
- 승인 대상은 mutable tag가 아니라 네 서비스의 `sha256` digest 목록이다. version·전체 commit SHA·`Dev`·`Dev-latest` tag가 같은 digest인지 확인한 뒤 운영 책임자가 목록을 승인한다. 정식 릴리스 때만 승인된 `v<VERSION>` tag 실행이 `Release`·`latest`를 추가한다.
- provenance에는 source `https://github.com/parking-place/LyricsCloud`, 전체 Git revision, Dockerfile 경로, build target, OCI revision label이 있어야 한다. 하나라도 예상과 다르면 배포를 중단한다.

## 검토한 대안

- registry password와 별도 장기 private signing key: 오프라인 검증은 단순하지만 새 고가치 secret의 생성·회전·복구 부담이 생겨 제외했다.
- tag만 승인: tag 이동을 탐지할 수 없어 제외했다.
- provenance만 확인하고 서명 생략: 생성 주체를 묶지 못해 제외했다.
- 별도 신규 registry: 현재 자체 운영·Docker Hub 계약과 운영 범위를 불필요하게 넓혀 제외했다.

## 비밀 값과 권한 경계

Docker Hub token은 GitHub Actions secret, username은 Actions variable에만 둔다. workflow는 `contents: read`, `id-token: write`만 사용한다. OIDC token, registry token, 서명 자료를 repository·image layer·운영 로그·승인 목록에 기록하지 않는다. 배포 호스트는 pull-only 자격 증명을 사용하고 CI publish 자격 증명을 공유하지 않는다.

## 자동·수동 검증

CI는 build가 돌려준 정확한 digest를 즉시 서명한 뒤 certificate identity/issuer로 `cosign verify`를 수행한다. 이어 BuildKit provenance에서 source·revision·Dockerfile·target을 검사한다. 운영자는 [`backup-restore-upgrade.md`](../runbooks/backup-restore-upgrade.md)의 명령으로 네 digest를 다시 검증하고 tag가 아닌 `@sha256`로 배포한다.

서명, transparency log, provenance, SBOM, 네 tag의 digest 일치 또는 전체 CI 중 하나라도 실패하면 artifact는 승인 불가다. 예외 승인은 허용하지 않으며 같은 commit의 CI를 다시 실행한다.

## 영향과 되돌림

CI publish job과 1.0.0 승인 목록이 이 계약을 소비한다. Sigstore 또는 registry를 교체하려면 새 OPS 결정을 만들고 기존·신규 체계를 겹쳐 발행·검증한 뒤 이전 결정을 `Superseded`로 남긴다. 관련 결정은 `OPS-0001`, `OPS-0004`, `ADR-0001`, `ADR-0008`이다.
