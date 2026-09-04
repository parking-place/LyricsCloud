# LyricsCloud 기여 가이드

이 저장소는 `main`과 `origin/main`이 연결되어 있습니다. 직접 `main`에 push하지 않고 아래 브랜치·커밋·PR 규칙을 적용합니다. 원격 branch protection과 required checks는 저장소 권한 보유자가 별도 체크리스트로 확인합니다.

## 작업 선택

1. [`STATUS.md`](<./0.Plans/1. Dev-phase/STATUS.md>)에서 현재 버전과 Phase를 확인합니다.
2. 현재 Phase 문서의 미완료 작업 ID 하나 또는 서로 강하게 연결된 작은 묶음을 선택합니다.
3. 활성 작업 표에 담당자, 경로, 의존성, 시작 시각을 기록합니다.
4. 같은 경로를 수정 중인 작업이 있으면 병렬로 시작하지 않습니다.

## 브랜치와 커밋

- 브랜치 예: `phase/0.3.0-p2-songform-parser`
- 커밋 예: `feat(editor): parse repeated song-form sections`
- 계획·구성만 바꾸는 경우 `docs`, `chore`, `test` 등 실제 변경 성격을 사용합니다.
- 서로 다른 Phase의 기능을 한 커밋이나 PR에 섞지 않습니다.
- Phase 검증과 상태 문서 갱신이 끝나면 작업 결과를 commit하고 `git push -u origin <phase-branch>`로 반드시 원격에 올립니다.
- push 후 원격 branch가 로컬 HEAD를 가리키는지 확인합니다. push가 실패하면 Phase를 완료 처리하거나 다음 Phase를 시작하지 않습니다.

## Pull Request

PR에는 다음을 포함합니다.

- 버전, Phase, 작업 ID
- 관련 `Sketch.md` 절과 목업 화면
- 사용자에게 달라지는 동작
- 데이터 schema·migration·환경 값 영향
- 실행한 검증과 결과
- 모바일·접근성·개인정보 확인 결과
- 알려진 제한과 다음 인계

기능이 완료되지 않았거나 후속 작업이 필수라면 Draft PR로 유지합니다.

## 완료 기준

- 현재 Phase에 명시된 자동·수동 검증을 통과했습니다.
- 새 동작의 실패·빈 상태와 권한 경계를 확인했습니다.
- 필요한 문서, 테스트, migration이 코드와 함께 갱신되었습니다.
- `STATUS.md`의 진행 상태와 인계 내용이 실제 저장소와 일치합니다.
- 사용자 관점 변경은 `CHANGELOG.md`의 `Unreleased`에 기록했습니다.
- Phase commit을 원격 작업 브랜치에 push했고 원격 반영을 확인했습니다.
