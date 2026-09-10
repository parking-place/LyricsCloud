# PROD-NF-003 — 개인 순서·목록 보기

- 상태: **1.0.7 보기 범위 Accepted; 1.0.8~1.0.9 순서 범위 Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.7 P1, 1.0.8 P1, 1.0.9 소비
- 승인: 2026-09-11 사용자의 1.0.14까지 전체 Phase·버전별 릴리스 실행 지시에 따라 1.0.7 P1 보기 범위를 승인했다. 개인 순서의 rank/anchor 세부는 1.0.8 P1 전까지 승인하지 않는다.

## 해결할 질문

보기 모드와 자료 유형별 개인 순서·전역 핀을 어떻게 분리할 것인가?

## 검토한 대안

1. 현재 자료 계약을 재사용하되 새 동작의 경계를 명시한다.
2. 모든 상태/권한/형식을 일괄 교체한다. 영향·이행 비용이 크므로 사전 검증 없이 선택하지 않는다.
3. 외부 의존 또는 구현 가능성이 확인되지 않으면 범위를 숨기지 않고 사용자에게 대안·차단 이유를 제시한다.

## 권장 선택과 이유

전체 ID 배열 덮어쓰기 대신 owner+type 범위의 anchor 이동 명령과 버전/멱등 검사를 권장한다. 보기 설정은 자료가 아니라 사용자 선호다.

### 1.0.7에서 승인한 보기 선택

- `library_view_settings`를 `user_settings` 및 자료 행과 분리하고 `(owner_id, resource_type)`를 기본 키로 둔다.
- 자료 유형은 `songs|rhymes|prompts`, mode는 `list|grid-small|grid-medium|grid-large`의 닫힌 집합이다.
- 행이 없을 때 기본값은 `list`이며 조회가 DB를 변경하지 않는다. 최초 저장은 row version 0, 이후 저장은 해당 행만 CAS로 갱신한다.
- API가 인증된 owner를 주입하며 client owner ID는 받지 않는다. 다른 owner/type/font 설정과 한 transaction으로 묶거나 전체 설정 snapshot을 덮어쓰지 않는다.
- 보기 전환은 현재 검색·필터·정렬·cursor/page·scroll과 item 배열을 유지한다. 실패하면 직전 mode를 복원하고 재시도 안내를 낸다.
- grid mode는 선호 카드 크기이고 고정 열 수가 아니다. 320px·200%에서도 1열 fallback, 전체 접근 이름, 보이는 action, 키보드 선택을 유지한다.

## 영향과 검증

보기 범위는 계정/자료유형 격리·동시 글꼴 저장·필터/페이지 불변·좁은 화면을 검증한다. 순서 범위는 필터 밖 자료 보존·동시 이동·복원·계정 격리·prompt 카드와 내부 토큰 순서 분리를 후속 Phase에서 결정한다. 실제 source SHA·변경 파일·schema·자동/수동 증거를 해당 Phase 인수표에 기록한다. 새 문서가 있다는 사실만으로 기존 Accepted 결정을 폐기하지 않는다.

## 되돌림·비용

보기 UI/API를 숨겨도 기존 목록은 기본 list로 동작한다. 새 테이블은 기존 원문·자료·`user_settings`와 분리되어 기능 rollback에 schema 삭제가 필요 없다. migration 역방향은 테이블만 drop하되 저장된 선호 소실을 명시하고 정식 운영에서는 별도 승인한다. 형식/권한을 되돌릴 때 미전송 선택·구버전 client의 호환을 확인한다.

## 범위 밖

미선택 Future 아이디어·원문 외부 전송·운영 배포·메이저 증가의 자동 승인은 포함하지 않는다.

[상세 계약](../../0.Plans/2.Patch-phase/contracts/LIBRARY-SUNO.md) · [결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md) · [버전별 작업 계획](../../0.Plans/2.Patch-phase/ROADMAP.md)
