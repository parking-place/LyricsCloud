# Product decisions

사용자가 보게 되는 자료 관계, 삭제·복원, 탐색 동작을 `PROD-*`로 기록합니다. 기술 구현은 ADR과 migration이 담당하지만 제품 의미는 이 기록을 조용히 바꾸지 않습니다.

| ID | 주제 | 상태 |
|---|---|---|
| [PROD-0002](./PROD-0002-song-resource-links.md) | 곡과 라임 노트·프롬프트의 연결 관계 | Accepted |
| [PROD-0005](./PROD-0005-quick-add.md) | 빠른 아이디어 자료 유형과 새 가사의 부모 곡 선택 | Accepted |
| [PROD-0006](./PROD-0006-rhyme-lyric-insertion.md) | 라임 선택과 열린 가사 삽입 대상 | Accepted |
| [PROD-0007](./PROD-0007-recent-work.md) | 최근 수정·열람과 마지막 가사 위치 복원 | Accepted |
| [PROD-0008](./PROD-0008-template-application.md) | 템플릿 적용·취소와 기존 내용 보호 | Accepted |
| [PROD-0010](./PROD-0010-soft-delete-restore.md) | soft delete, cascade와 복원 관계 | Accepted |

## 후속 계획의 제안

다음 문서는 모두 `Proposed`이며, 승인·소비 Phase는 [후속 결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md)에서 확인합니다.

- [PROD-NF-001](./PROD-NF-001-beta-onboarding.md): 베타 가입 동선
- [PROD-NF-002](./PROD-NF-002-editor-output.md): 편집·복사 결과
- [PROD-NF-003](./PROD-NF-003-library-order-views.md): 목록 정렬·보기
- [PROD-NF-004](./PROD-NF-004-suno-work-links.md): Suno 작업 링크
- [PROD-NF-005](./PROD-NF-005-sharing-scope.md): 읽기·쓰기 공유 범위
- [PROD-NF-006](./PROD-NF-006-ui-transition.md): 디자인 승인·점진 적용


- [PROD-NF-007 — 세 언어 단어 Tooltip](./PROD-NF-007-dictionary-tooltip.md): Proposed, 1.0.13 P1.


- [PROD-NF-008 — 무료 폰트 선택·다국어 표시](./PROD-NF-008-web-fonts.md): Proposed, 1.0.14 P1.


- [PROD-NF-009 — 여러 사용자 동시 작업과 위치 표시](./PROD-NF-009-collaboration-presence.md): Proposed, 1.1.0 P1; 1.1.2 P1 확장.
