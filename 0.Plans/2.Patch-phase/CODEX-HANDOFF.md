# 로컬 Codex 실행 인계

**첫 작업은 코드 작성이 아니라 현재 작업 인수다.** 이 문서 패키지는 후속 계획이며 P6 종료·새 기능 구현·main 병합·운영 배포 완료를 뜻하지 않는다.

이번 문서 작업은 **1.0.1 P1 준비·인수**까지다. 현재 실행 STATUS는 P6 `review`를 유지하며 P1 실제 착수·상태 전환은 담당자가 선행조건을 확인해 판단한다.

## 현재 인수 출발점

2026-09-09 사용자가 [P6 PR #11](https://github.com/parking-place/LyricsCloud/pull/11)을 `phase/1.0.0-p5-final-release`에 병합하고 원격 P6 브랜치를 삭제했다. 병합 기준은 `7c3930b5bc2be4f25f8f7586b7ce3f02b039af99`이며 코드 후보 `405e5351454bc3965227d5c824f9c996f6cc0233`과 tree가 같다. 로컬 문서 작업도 이 병합 기준에서 이어간다.

코드 후보의 [push CI](https://github.com/parking-place/LyricsCloud/actions/runs/34313667906)와 [PR CI](https://github.com/parking-place/LyricsCloud/actions/runs/34313670969)는 통과했다(save CV 각각 1.814%·4.201%). 병합 SHA의 [CI](https://github.com/parking-place/LyricsCloud/actions/runs/34320237384)는 save p95 4.319ms로 예산 120ms 이내이고 오류 0이지만, 3회 p95 CV 130.793%가 기준 75%를 초과해 실패했다. 두 commit의 tree는 `4c6820dab03f086f7dc5c000e5ca16f88ba5950d`로 같으며 코드 충돌·누락 증거는 없다. P5 CI 성공 시 공용 Dev tag 자동 발행이 활성화돼 있어 이 조사에서는 재실행하지 않았다.

사용자 PC는 후보와 동일 소스의 production 빌드이며 병합 SHA로 새 배포한 것은 아니다. P6는 실제 기기·OS IME·공개 HTTPS와 남은 품질/운영 인수까지 `review`를 유지한다. 세부 증거는 [P6 runbook](../../docs/runbooks/1.0.0-phase6-stabilization.md), 실행 상태는 [기존 STATUS](<../1. Dev-phase/STATUS.md>)에서 확인한다.

후보 129개는 [Future_Feature.md](Future_Feature.md)에 보존하며 다른 위치의 Future 계획도 검수한다. 모든 push 전과 각 Phase 완료 때 [검수 인수 절차](FUTURE-INTAKE.md)에 따라 이전 인수 commit/blob과 실제 Git 변경을 한 번 대조하고, 체크·설명·범위의 변경을 재판정해 차기 patch에 배정한다. 변경이 없으면 추가 계획 없이 진행한다. 전체 계획 인수는 [REVIEW-CHECKLIST](REVIEW-CHECKLIST.md)에 기록한다. 기존 P6에서 해결한 경로는 증거를 재사용하고 미완료 인수만 이어간다.

## 시작 순서

1. root Agent/AGENTS, 현재 실행 STATUS, 미커밋 변경과 로컬 담당 범위를 읽는다.
2. P6 최종 SHA와 REVIEW/OPS/RC의 해결·잔여·오탐 판정을 실제 테스트 증거와 인수한다.
3. [로드맵](ROADMAP.md), [번호 규칙](VERSIONING.md), [규정 통합](GOVERNANCE-INTEGRATION.md)을 읽는다.
4. [1.0.1 BRIEF](1.0.1/BRIEF.md)와 [P1](1.0.1/1phase.md)에서 사용자 필수 범위·IME·beta·release 계약을 시작한다.
5. 승인된 해당 Phase 작업만 수행하고 실패 재현→최소 수정→회귀→검토 가능한 commit으로 진행한다.

## 우선순위

원문 유실/인증 우회/무음 저장 실패 → 한글·버튼·테마 결함 → 해시 allowlist·긴급 CLI와 안전 가입 → 브랜드·README·문서·릴리스 인수 순서다. CLI는 1.0.1 P2에서 검증 가능한 산출물로 만든다. 1.0.1 필수 기능을 뒤 버전으로 미루거나 1.0.2를 출시 차단 결함 보관함으로 쓰지 않는다.

## 작은 업데이트 규칙

한 번에 현재 버전의 배정된 Phase만 수행한다. 기본은 5개이며 필요하면 추가한다. 후속 기능을 미리 schema/UI에 숨겨 넣지 않는다. 독립 완결 기능과 그 보존/권한/오류 테스트를 함께 마무리한다. 개인 기능은 1.0.x를 계속 사용하고, 공유 모델 승인 때만 1.1.0을 검토한다. 디자인 적용과 native 추가만으로 minor를 올리지 않는다.

## 승인 경계

새 기술 결정은 Proposed이다. 네이티브 개발안/실험은 계획 범위지만 실제 앱 구현은 별도 사용자 승인 후 진행한다. UX는 [design/UX](design/UX/README.md) 승인 뒤 구현한다. Future 파일의 변경은 외부 검수 입력이며 현재 진행 Phase에 자동 편입하거나 구현 완료로 처리하지 않는다. 체크 해제만으로 완료 구현을 삭제하지 않는다.

## 인수 기록 형식

```text
실제 version / Phase / 담당:
기준·완료 source SHA / tree:
변경 파일 / 추가 migration / API·protocol 영향:
실행한 명령 / 환경 / fail→pass 증거:
실제 OS·브라우저·IME·물리 기기:
원격 CI run/attempt / 동일 SHA dev smoke:
보존·인가·복구 불변조건 판정:
미실행 / 잔여 결함 / 외부 차단 / 승인 필요:
다음 Phase 입력과 중단 조건:
```

계획 패키지의 문서 검사 성공은 제품 테스트 성공이 아니다. source 경로 중 '신규 제안'은 실제 구현 때 만드는 후보이며 현재 존재한다고 가정하지 않는다. 실제 실행 명령은 [QUALITY-GATES](QUALITY-GATES.md)와 착수 시 manifest로 대조한다.

## 부모 작업 인계 — 원본 보존

2026-09-09 부모가 원본 `LyricsCloud_Plans`의 193파일과 Git 제외 `.private/lyricscloud-plans-original-20260909.zip` 내부 모든 SHA256 일치를 확인했다. 사용자 재승인 뒤 안전 경로를 확인한 Remove-Item도 자동 승인 검토에서 `blocked by policy`로 거부됐다. 원본과 ZIP은 그대로 보존하며 삭제/이동 우회하지 않는다. 최종 commit은 원본 번들과 비공개 백업을 제외한다. 문서 담당자는 원본을 읽거나 수정·삭제하지 않았다.

부모 확인 당시 remote P5는 `7c3930b`, main은 `0e7dbf6`이며 `codex/1.0.1-p1-plan-handoff`는 미게시다. 이 값은 확인 시점의 인계이며 이후 Git/PR 상태는 부모가 갱신한다.
