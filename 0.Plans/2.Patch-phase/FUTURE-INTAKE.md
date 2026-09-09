# Future 계획 검수 인수

이 절차는 **모든 push 직전과 각 Phase 완료 시** 사용한다. Future 계획은 저장소 어디에 두어도 검수 입력이다. 현재 [Future_Feature.md](Future_Feature.md)는 후보 129개를 보존하는 기준 문서이며 고정 경로만 읽지 않는다.

## 한 번 확인하고 기록하기

1. 저장소 루트에서 Git tracked 목록과 `rg --files --hidden` 결과를 대조해 파일명에 `future`가 있는 문서를 대소문자 무관하게 찾는다. `git status --short --untracked-files=all`, staged/unstaged diff의 이름·이동·삭제도 함께 확인한다. 필요할 때 문서 제목의 Future/후속 계획/추가 기능 표현으로 보완한다.

   ```powershell
   git ls-files --cached | rg -i '(^|[/\\])[^/\\]*future[^/\\]*$'
   rg --files --hidden -g '!.git/**' -g '!node_modules/**' -g '!.private/**' -g '!LyricsCloud_Plans/**' | rg -i '(^|[/\\])[^/\\]*future[^/\\]*$'
   git status --short --untracked-files=all
   git diff --name-status
   git diff --cached --name-status
   ```

   tracked 목록에서도 이름을 같은 기준으로 대조한다. tracked 파일은 ignore 규칙과 무관하게 확인하고, untracked/hidden 문서는 위 rg 결과로 포함한다. ignored·비공개 자료는 `--no-ignore`, `git add -f` 등으로 자동 읽기/공개하지 않는다. 알려진 ignored 문서가 검수 원본이면 소유자에게 비밀 없는 공개 검수본 또는 승인된 참조를 받는다. 원본 번들·백업·동일 blob 사본은 후보와 구분하고 중복 처리하지 않는다.
2. 발견 경로를 현재 검수 입력 / 원본·백업 / 중복 / 비공개 참조로 분류한다. 제목·출처·FF-ID와 내용이 다르면 임의 덮어쓰지 않고 충돌 내용을 기록한다. 파일 게시·이동 자체는 채택·구현 완료·배포 승인이 아니다.
3. 첫 publish에서는 검토한 파일의 `git hash-object -- <path>` blob을 게시 담당자가 기록하고, commit 후 그 commit의 실제 blob과 대조한다. 재검수는 마지막 인수 commit/blob을 기준으로 존재·신규·이동·삭제·체크·본문 변경을 한 번 비교한다. 미게시 파일은 commit='미게시'와 현재 blob·출처를 적으며 없는 SHA를 만들지 않는다.
4. 새 체크·설명/예시/범위 수정·체크 해제를 모두 검수 입력으로 본다. FF-ID가 같아도 내용이 달라지면 재검수한다. 기존 구현·예정·[필수 이관표](../../docs/planning/mandatory-future-mapping.md)와 중복 대조하고 추가 범위만 차기 적합 patch/Phase에 배정한다. 기본 5 Phase, 의존성·업무량이 크면 실질적 산출물 단위로 추가한다. 현재 Phase에 자동 삽입하거나 체크 해제만으로 기존 구현을 삭제하지 않는다.
5. 출처+blob+FF-ID+변경 범위와 기존 처리 기록으로 같은 변경을 재처리하지 않는다. push 검수와 Phase 완료 사이에 변화가 없으면 같은 기록을 참조한다. 기준 누락·상충·미승인은 이유를 남기고 해당 배정만 보류한다. 새 아이디어는 FF-301 이상 미사용 ID로만 제안하며 숫자 채우기·기본 보안 조건을 후보로 늘리지 않는다.

## 인수 기록

최초 게시 기준은 아래 실제 Git blob이다. 이 blob을 처음 포함한 commit은 해당 경로의 Git 이력에서 확인하며, 게시 후 원격 commit의 blob과 다시 대조한다. 기존 후보의 129개 ID·체크·설명·예시를 보존했고 필수 중복 범위는 [이관표](../../docs/planning/mandatory-future-mapping.md)에 배정했다. 기존 인수 기록은 덮어쓰지 않고 아래 행을 누적한다.

| 시점·push/완료 Phase | 출처·현행/이전 경로 | 분류 | 기준 commit/blob → 현재 commit/blob | FF-ID·변경 범위 | 배정 patch/Phase 또는 보류 이유 | 이전 처리 참조 |
|---|---|---|---|---|---|---|
| 2026-09-09 문서 개정 | 사용자 최신 요구·Future_Feature.md | 현행 검수 입력 | 최초 게시 전, 부모가 실제 blob 기록 예정 | 기존 129개 보존·필수 이관표 | 필수 범위는 이관표, 독립 추가 편의는 선택 유지 | [번호 이력](../../docs/planning/plan-revision-2026-09-09.md) |
| 2026-09-09 최초 push 전 검수 | `0.Plans/2.Patch-phase/Future_Feature.md` | 현행 검수 입력 | 최초 기준 blob `8f42d20b638e245eb775415ccfdabef56a96f694` | 후보 129개·체크 상태 보존, Markdown hard break 표기만 정규화·필수 범위 이관 | 이관표의 버전/Phase에 배정, 그 외 선택 후보는 미채택 유지 | 위 문서 개정 행 |
| 2026-09-09 1.0.1 P1 중간 push 전 | `0.Plans/2.Patch-phase/Future_Feature.md` | 현행 검수 입력 | `bc8336627368e65c6b1f2df63c9e17f883207888` / `8f42d20b638e245eb775415ccfdabef56a96f694` → 동일 blob | 후보 ID·체크·본문 변경 없음 | 재배정 없음; P1 승인 계약과 기존 이관표 유지 | 최초 push 전 검수 행 |
| 2026-09-09 1.0.1 P1 완료·P2 착수 push 전 | `0.Plans/2.Patch-phase/Future_Feature.md` | 현행 검수 입력 | `381f94483d0fd8832d6d25da376977aa2ef5b6b7` / `8f42d20b638e245eb775415ccfdabef56a96f694` → 동일 blob | 후보 ID·체크·본문 변경 없음 | 재배정 없음; P1 재현 인수와 기존 P2~P10 배정 유지 | 1.0.1 P1 중간 push 전 행 |

이때 전역 탐색으로 현행 후보 파일과 이 절차 문서, `docs/planning/future-idea-scope.md`, `docs/planning/mandatory-future-mapping.md`를 찾았다. 뒤의 세 문서는 절차·이력·매핑 근거이며 별도 선택 목록으로 중복 처리하지 않았다. 원본 `LyricsCloud_Plans` 사본과 비공개 ZIP은 보존·업로드 제외 대상으로 구분했다. 다른 위치에서 추가된 검수 후보 파일은 없었다.

자동 hook·새 검수 스크립트·별도 스케줄을 만들지 않는다. Agent.md의 필수 단계와 이 절차 한 곳을 사용한다.
