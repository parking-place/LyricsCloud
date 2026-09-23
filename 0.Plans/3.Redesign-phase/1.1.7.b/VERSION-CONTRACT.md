# 1.1.7b 정확한 버전·도구·발행 계약

사용자의 2026-09-23 지시는 제품/계획 번호를 정확히 **1.1.7b**로 지정했다. 아래는 이번 웹 통합에 한정한 명시적 매핑이며 일반 알파벳 suffix를 허용하는 정책이 아니다. 계획 작성 중 runtime/도구는 변경하지 않는다. **실제 P1 완료 CI 전에 지원해야 한다.**

## 표현과 이력

| 용도 | 계획값 | 주의 |
|---|---|---|
| 제품·VERSION·APP_VERSION·UI/health | `1.1.7b` | 실제 구현 착수 때 함께 변경하며 문서 작성 중에는 a 유지 |
| 계획 폴더·실행 phase 경로 | `3.Redesign-phase/1.1.7.b/Nphase.md` | 제품 문자열과 다른 정확한 매핑 |
| private npm package | `1.1.7` | 기존 a와 같은 SemVer 표현. 제품 표기는 별도 검증하며 npm prerelease로 재해석하지 않음 |
| 개발 Phase branch | `phase/1.1.7b-pN-<topic>` | 기존 구현 branch 파서 관례. 문서 branch는 `codex/1.1.7b-web-integration-plan` |
| 개발 image | full SHA / `dev-1.1.7b-pN` | 정식 Release/latest 별칭을 이동하지 않음 |
| 미래 정식 tag/image | `v1.1.7b` / `1.1.7b` | 현재 미발행·미승인. 실제 정식 승인/검증 후에만 생성 |
| 다음 디자인 | `1.2.0` | b 인수 SHA에서 시작. 정식 b 태그 발행 자체는 추가 선행 조건이 아님 |

현재 a·v1.1.7·1.1.8 개발 이력/tag/migration은 재작성하지 않는다. b는 순서상 a 뒤의 제품 통합 마일스톤이다. 일반 SemVer 문자열 비교로 a/b/숫자 버전의 순서를 추정하지 않는다.

## 현재 코드에서 확인한 P1 장애와 책임

| 경계·실제 파일 | 현재 조건 | P1에서 할 일 |
|---|---|---|
| `scripts/release-phase-state.mjs` | a만 예외이며 `2.Patch-phase`와 기존 숫자 경로만 허용 | b ↔ `1.1.7.b`·`3.Redesign-phase`를 정확히 허용하고 불일치/다른 경로 거부 |
| `scripts/image-publication-plan.mjs`, `scripts/docker-image-tag.sh`, `scripts/deploy-development.sh` | a만 예외인 version/branch/tag 검사 | 정확한 b와 phase/source 일치·dev/release 구분·a/다자리 버전 회귀 |
| `packages/config/src/index.ts`, Next 설정·Compose·Playwright·CI 기대값 | production 값/기본 build 표기가 a 또는 source의 1.1.8에 고정 | 실제 b phase와 신뢰 가능한 source SHA를 통일. hostname으로 배포 출처를 추정하지 않음 |
| `scripts/tests/oneoff-117a-version.mjs`, config test | b를 명시 거부하는 기존 음성 시험 | 승인된 b 성공 시험 추가. 미승인 c·잘못된 폴더·개행·tag/source 불일치 거부와 a 보호 검사 유지 |
| `scripts/generate-1002-release-manifest.mjs`, `scripts/validate-1002-release-artifacts.mjs` | 생성기는 숫자 위주, package/schema 예외는 a만 지원 | b 생성 → 검증 왕복과 private package 매핑·현재 파일 목록/해시/스키마 검사 |
| `scripts/validate-1005-final-release.mjs` | 1.0.1만 10 Phase, 그 외는 5이며 과거 P5 증거와 결합 | 계획별 Phase 수·최종 Phase 소비, 실제 버전의 수용표/증거 연결. b의 5·1.2.2의 6·기존 a/숫자 회귀 |
| `scripts/validate-0915-release-operations.mjs`와 1002/1005 | manifest 존재가 조기 최종 validator를 켜고 dev에도 `productionAuthorized`를 강제할 수 있음 | dev 후보 검사와 명시적 `require-release`/최종 봉인 검사 분리. 승인 false를 사실대로 기록하면서 dev 검증이 가능해야 하며 정식 gate는 유지 |
| 원격 strict-tag regression | `windows-native` needs/문자열과 결합 | 원본 정책을 웹 필수 검사에 적용한 회귀로 이식. native job을 자동 추가하지 않음 |

P1은 공통 경로/버전 매핑/Phase metadata의 최초 지원을 담당한다. **1.2.0 P1-06은 이 기반의 인수와 실제 1.2.0 전환/회귀**, 1.2.8은 남은 중복 정리를 담당한다. 미래 버전의 제품 기능을 P1에 구현하지 않되 1.2.0 경로와 1.2.2의 6 Phase는 합성 metadata 회귀로 준비한다. CI의 `APP_PHASE == p5` 같은 조건도 실제 최종 Phase를 소비해야 한다. 파서만 6을 허용하고 필수 최종 job을 P5에 고정하면 완료가 아니다.

## 필수 입력 행렬

- 승인된 숫자 버전·a·b의 정상 제품/폴더 조합과 Phase 1/최종 Phase를 검사한다. b의 최종은 P5, 1.2.2의 최종은 P6이며 다자리 patch/Phase도 기존 계약에 맞게 검증한다.
- b 제품+a 폴더, a 제품+b 폴더, 임의 c/suffix, 선행 0, 개행/경로 이탈, 중복 `current_version`/누락 필드, 계획 상한을 넘은 Phase는 거부한다. **b P6는 거부하고 1.2.2 P6는 허용**한다.
- dev branch/정식 tag 불일치·source SHA 누락·release 요청의 미완료 Phase/승인 false는 거부한다.
- dev 후보 검사는 `productionAuthorized=true`를 요구하지 않아야 한다. 최종 정식 검사는 정확한 tag·manifest·서명·승인과 모든 gate를 요구하는지 별도로 시험한다.
- b 공용 runtime/health/build/패키지 매핑·source SHA가 일치하고 변경 전 a image와 후보 b image를 식별할 수 있어야 한다.

## P1 계약 파일과 P5 최종 봉인의 구별

P1에서 b용 환경 schema·migration 목록·license 목록·release manifest의 경로와 필수 내용을 준비하고 생성/검증 도구를 맞췄다. 실제 파일은 `config/environment-schema.1.1.7b.json`, `config/migrations.1.1.7b.json`, `config/licenses.1.1.7b.json`, `config/release-manifest.1.1.7b.json`이다. P1은 dev 후보의 구조/환경과 `productionAuthorized=false`를 검증했으며, P5의 최종 hash·문서·image 증거 봉인 및 정식 승인과 구별한다.

현재 루트·3개 app·7개 package의 private manifest는 기존 SemVer `1.1.7`을 유지하는 계획이다. 제품 `1.1.7b`와의 매핑을 별도 검증하고, 실제 package 목록이 변했다면 그 목록도 다시 확인한다. 원격 1.1.8 manifest는 1150/1151 목록이 runtime과 다를 수 있으므로 그대로 복사하지 않는다. a의 `productionAuthorized`도 b 승인이 아니다. native 1150이 이미 있는 DB의 호환성은 별도 수용표에 기록한다.

## 정식 릴리스 경로

문서/구현 Phase용 독립 branch·PR을 사용한다. 과거 `release/1.1.7a`에 대한 main 절차 예외는 b까지 확장하지 않는다. P5 인계에는 정식 통합 대상·tag·image·릴리스 서버의 승인 상태를 사실대로 남긴다. 정식 경로 결정이 필요하면 실제 실행 직전에 구체적인 후보와 증거를 준비한다. 이번 계획 작성에서 정식 발행이나 서버 변경 승인을 새로 요구하지 않는다.
