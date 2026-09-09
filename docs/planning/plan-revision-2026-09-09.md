# 2026-09-09 미발행 계획 정비 이력

이번 변경은 현재 import 문서를 이어서 보강한 것이다. 최초 import의 23개 버전·115개 제품 Phase·5개 UX 단계·730개 작업 정의는 출발점이며 현재 총계가 아니다. 실행 1.0.0 P6 review, 발행된 Git/version/migration 이력은 그대로다.

## 경로와 번호

계획 루트는 `0.Plans/2.new-feature-phase`에서 `0.Plans/2.Patch-phase`로 이동했다. 원본 Sketch·Implementation-Stack·Mock-up은 보존한다. 원본 번들/ZIP 검증·삭제는 부모 작업이며 이 문서 담당자가 수행하거나 완료로 단정하지 않는다.

| 이전 미발행 계획 | 현재 계획 | 이유 |
|---|---|---|
| 1.0.1 P1~P5 | 1.0.1 P1~P10 | 긴급 CLI P2 유지, 해시/가입/IME/UI/브랜드/도구/통합/후보 분리 |
| 1.1.7 Windows 읽기 | 1.1.8 | UI 적용 후 동선 인수 1.1.7 추가 |
| 1.1.8 Windows 작성 | 1.1.9 | 동일 순서 이동 |
| 1.1.9 Android 읽기 | 1.1.10 | 동일 순서 이동 |
| 1.1.10 Android 작성 | 1.1.11 | 동일 순서 이동 |
| 신규 필수 보강 | 1.0.13 사전, 1.0.14 폰트 | 개인 기능 계열 유지, 공유 진입 전 인수 |
| 누락 OS 개발안 | 1.1.12 Linux, 1.1.13 macOS, 1.1.14 iOS | OS별 기술·패키징·실기기 검증 뒤 조건부 구현 |

1.1.7~1.1.10의 기존 task ID는 버전 부분만 위 새 번호로 바꾸고 작업 본문·체크는 보존했다. 나머지 기존 버전 task ID는 유지한다. 1.0.1의 40개 원래 task는 아래 새 ID로 한 번씩 배정하고 실제 신규 세부 작업만 덧붙였다. 기존 번호를 다른 의미로 재사용하는 대신 이 표로 과거 초안과 대조한다.

## 1.0.1 task 이동

| 기존 ID | 현재 ID·Phase |
|---|---|
| `LC-NF-1.0.1-P1-01` | [`LC-NF-1.0.1-P1-01`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-02` | [`LC-NF-1.0.1-P1-02`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-03` | [`LC-NF-1.0.1-P1-03`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-04` | [`LC-NF-1.0.1-P1-04`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-05` | [`LC-NF-1.0.1-P1-05`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-06` | [`LC-NF-1.0.1-P1-06`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-07` | [`LC-NF-1.0.1-P1-07`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P1-08` | [`LC-NF-1.0.1-P1-08`](../../0.Plans/2.Patch-phase/1.0.1/1phase.md) |
| `LC-NF-1.0.1-P2-04` | [`LC-NF-1.0.1-P2-01`](../../0.Plans/2.Patch-phase/1.0.1/2phase.md) |
| `LC-NF-1.0.1-P2-05` | [`LC-NF-1.0.1-P2-02`](../../0.Plans/2.Patch-phase/1.0.1/2phase.md) |
| `LC-NF-1.0.1-P2-06` | [`LC-NF-1.0.1-P2-03`](../../0.Plans/2.Patch-phase/1.0.1/2phase.md) |
| `LC-NF-1.0.1-P2-07` | [`LC-NF-1.0.1-P2-04`](../../0.Plans/2.Patch-phase/1.0.1/2phase.md) |
| `LC-NF-1.0.1-P2-08` | [`LC-NF-1.0.1-P2-05`](../../0.Plans/2.Patch-phase/1.0.1/2phase.md) |
| `LC-NF-1.0.1-P2-03` | [`LC-NF-1.0.1-P3-01`](../../0.Plans/2.Patch-phase/1.0.1/3phase.md) |
| `LC-NF-1.0.1-P3-01` | [`LC-NF-1.0.1-P4-01`](../../0.Plans/2.Patch-phase/1.0.1/4phase.md) |
| `LC-NF-1.0.1-P3-02` | [`LC-NF-1.0.1-P4-02`](../../0.Plans/2.Patch-phase/1.0.1/4phase.md) |
| `LC-NF-1.0.1-P3-03` | [`LC-NF-1.0.1-P4-03`](../../0.Plans/2.Patch-phase/1.0.1/4phase.md) |
| `LC-NF-1.0.1-P3-08` | [`LC-NF-1.0.1-P4-04`](../../0.Plans/2.Patch-phase/1.0.1/4phase.md) |
| `LC-NF-1.0.1-P4-03` | [`LC-NF-1.0.1-P4-05`](../../0.Plans/2.Patch-phase/1.0.1/4phase.md) |
| `LC-NF-1.0.1-P2-01` | [`LC-NF-1.0.1-P5-01`](../../0.Plans/2.Patch-phase/1.0.1/5phase.md) |
| `LC-NF-1.0.1-P2-02` | [`LC-NF-1.0.1-P5-02`](../../0.Plans/2.Patch-phase/1.0.1/5phase.md) |
| `LC-NF-1.0.1-P4-01` | [`LC-NF-1.0.1-P5-03`](../../0.Plans/2.Patch-phase/1.0.1/5phase.md) |
| `LC-NF-1.0.1-P4-07` | [`LC-NF-1.0.1-P5-04`](../../0.Plans/2.Patch-phase/1.0.1/5phase.md) |
| `LC-NF-1.0.1-P3-04` | [`LC-NF-1.0.1-P6-01`](../../0.Plans/2.Patch-phase/1.0.1/6phase.md) |
| `LC-NF-1.0.1-P3-05` | [`LC-NF-1.0.1-P6-02`](../../0.Plans/2.Patch-phase/1.0.1/6phase.md) |
| `LC-NF-1.0.1-P3-06` | [`LC-NF-1.0.1-P7-01`](../../0.Plans/2.Patch-phase/1.0.1/7phase.md) |
| `LC-NF-1.0.1-P3-07` | [`LC-NF-1.0.1-P7-02`](../../0.Plans/2.Patch-phase/1.0.1/7phase.md) |
| `LC-NF-1.0.1-P4-06` | [`LC-NF-1.0.1-P8-01`](../../0.Plans/2.Patch-phase/1.0.1/8phase.md) |
| `LC-NF-1.0.1-P4-08` | [`LC-NF-1.0.1-P8-02`](../../0.Plans/2.Patch-phase/1.0.1/8phase.md) |
| `LC-NF-1.0.1-P5-02` | [`LC-NF-1.0.1-P8-03`](../../0.Plans/2.Patch-phase/1.0.1/8phase.md) |
| `LC-NF-1.0.1-P4-02` | [`LC-NF-1.0.1-P9-01`](../../0.Plans/2.Patch-phase/1.0.1/9phase.md) |
| `LC-NF-1.0.1-P4-04` | [`LC-NF-1.0.1-P9-02`](../../0.Plans/2.Patch-phase/1.0.1/9phase.md) |
| `LC-NF-1.0.1-P4-05` | [`LC-NF-1.0.1-P9-03`](../../0.Plans/2.Patch-phase/1.0.1/9phase.md) |
| `LC-NF-1.0.1-P5-04` | [`LC-NF-1.0.1-P9-04`](../../0.Plans/2.Patch-phase/1.0.1/9phase.md) |
| `LC-NF-1.0.1-P5-01` | [`LC-NF-1.0.1-P10-01`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |
| `LC-NF-1.0.1-P5-03` | [`LC-NF-1.0.1-P10-02`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |
| `LC-NF-1.0.1-P5-05` | [`LC-NF-1.0.1-P10-03`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |
| `LC-NF-1.0.1-P5-06` | [`LC-NF-1.0.1-P10-04`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |
| `LC-NF-1.0.1-P5-07` | [`LC-NF-1.0.1-P10-05`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |
| `LC-NF-1.0.1-P5-08` | [`LC-NF-1.0.1-P10-06`](../../0.Plans/2.Patch-phase/1.0.1/10phase.md) |

후보 129개는 기존 FF-ID·체크·설명·예시를 보존한다. 최신 필수 요구와 중복된 부분은 [필수 이관표](mandatory-future-mapping.md)에 표시하며 다시 선택받지 않는다. 새 후보를 숫자 채우기로 추가하지 않았다.

## 부모 작업 인계 — 원본 보존

2026-09-09 부모가 원본 `LyricsCloud_Plans`의 193파일과 Git 제외 `.private/lyricscloud-plans-original-20260909.zip` 내부 모든 SHA256 일치를 확인했다. 사용자 재승인 뒤 안전 경로를 확인한 Remove-Item도 자동 승인 검토에서 `blocked by policy`로 거부됐다. 원본과 ZIP은 그대로 보존하며 삭제/이동 우회하지 않는다. 최종 commit은 원본 번들과 비공개 백업을 제외한다. 문서 담당자는 원본을 읽거나 수정·삭제하지 않았다.

부모 확인 당시 remote P5는 `7c3930b`, main은 `0e7dbf6`이며 `codex/1.0.1-p1-plan-handoff`는 미게시다. 이 값은 확인 시점의 인계이며 이후 Git/PR 상태는 부모가 갱신한다.
