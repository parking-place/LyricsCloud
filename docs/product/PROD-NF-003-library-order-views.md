# PROD-NF-003 — 개인 순서·목록 보기

- 상태: **1.0.7 보기·1.0.8 곡 순서 범위 Accepted; 1.0.9 라임/프롬프트 순서 Proposed**
- 작성일: 2026-09-09
- 결정 Phase: 1.0.7 P1, 1.0.8 P1, 1.0.9 소비
- 승인: 2026-09-11 사용자의 1.0.14까지 전체 Phase·버전별 릴리스 실행 지시에 따라 1.0.7 P1 보기 범위와 1.0.8 P1 곡 순서 범위를 승인했다. 1.0.9의 라임/프롬프트 적용은 곡 인수 결과를 먼저 소비한다.

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

보기 범위는 계정/자료유형 격리·동시 글꼴 저장·필터/페이지 불변·좁은 화면을 검증한다. 1.0.8 곡 순서는 다음 계약을 따른다.

- 별도 order state와 item rank를 `owner_id + resource_type`으로 격리한다. 기존 자료 `row_version`, 보기 설정, `pin_order`를 재사용하지 않는다.
- `song` rank는 핀/미핀 그룹별 signed bigint gap으로 저장하며 안정 ID는 최종 tie-break다. 공간 소진 시 해당 owner/type/group만 재분배한다.
- 비사용자 정렬은 기존 핀/정렬 규칙을 유지하고 `manual`만 핀 그룹 뒤 manual rank를 사용한다. 이동은 `pin_order`를 변경하지 않으며 그룹 교차는 명시적으로 거부한다.
- 이동 body는 UUID request/item/before/after와 expected order version만 받는다. 전체 배열, client owner, rank, 필터 query는 받지 않는다.
- `beforeId`가 있으면 전체 목록에서 그 anchor 바로 앞에 삽입한다. 없으면 `afterId` 바로 뒤에 삽입한다. 둘 다 있으면 대상 제거 후 같은 그룹에서 after가 before보다 앞서야 한다.
- owner/type lock, CAS, 요청 payload hash/결과 저장으로 동시 요청과 응답 역전을 수렴시킨다. 동일 요청 재전송은 version/rank를 다시 변경하지 않는다.
- 새 곡·복제는 현재 핀 그룹 끝에 붙고 soft delete는 rank를 보존한다. restore는 원래 rank를 쓰며 hard purge만 순서 행을 제거한다. 핀 변경은 새 그룹 끝으로 원자 이동한다.
- manual paging cursor는 query signature와 order version을 포함한다. version이 바뀐 cursor는 충돌로 중단하고 첫 페이지를 새로 읽는다.

P2는 migration/store/API와 실제 DB 실패 fixture, P3는 drag·키보드/버튼·실패 원복 UI, P4는 필터 밖 자료·동시 이동·owner 격리·복원·브라우저/재시작을 검증한다. 라임/프롬프트 순서와 prompt 내부 token 순서는 1.0.9에서 분리해 결정한다. 실제 source SHA·변경 파일·schema·자동/수동 증거를 해당 Phase 인수표에 기록한다. 새 문서가 있다는 사실만으로 기존 Accepted 결정을 폐기하지 않는다.

## 되돌림·비용

보기 UI/API를 숨겨도 기존 목록은 기본 list로 동작한다. 순서 UI/API를 숨기고 `manual` 요청을 기존 `updated_desc`로 되돌리면 구버전 정렬은 계속 동작한다. 순서 테이블은 원문·자료·보기 설정과 분리되어 application-first rollback에 삭제할 필요가 없다. migration 역방향은 order state/item/request만 drop하되 저장된 개인 순서가 사라지므로 정식 운영에서는 별도 승인한다. 기능을 다시 켤 때 migration/backfill을 멱등 확인하고, 미전송 이동·구버전 client·핀 순서를 검사한다.

## 범위 밖

미선택 Future 아이디어·원문 외부 전송·운영 배포·메이저 증가의 자동 승인은 포함하지 않는다.

[상세 계약](../../0.Plans/2.Patch-phase/contracts/LIBRARY-SUNO.md) · [결정 색인](../../0.Plans/2.Patch-phase/Decision-Ownership.md) · [버전별 작업 계획](../../0.Plans/2.Patch-phase/ROADMAP.md)
