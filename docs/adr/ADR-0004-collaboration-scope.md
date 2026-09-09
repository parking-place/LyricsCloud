# ADR-0004 — 자동 병합 사용자 범위와 문서 의미

- 상태: Accepted
- 승인자·일시: 사용자, 2026-09-04
- 결정 Phase: 0.0.0 Phase 2
- 입력: DEC-02-A, DEC-06-C

## 대안

1. 같은 owner의 기기·탭만 자동 병합한다.
2. 여러 사용자 초대·공동 편집까지 포함한다: membership·role·presence·감사 기능이 필요하다.
3. 자동 병합 없이 충돌 복사본만 보존한다: DEC-06-C를 충족하지 못한다.

## 권고 결정

1.0에서는 같은 `owner_id`의 인증된 기기·탭만 연결한다. 다른 사용자의 presence, 초대, 링크 공유, 편집 권한은 만들지 않는다. editable resource 하나당 CRDT 문서 하나를 두며 문서 키는 외부 resource ID와 직접 같지 않은 서버 발급 opaque ID다.

오프라인 변경은 재연결 시 자동 병합한다. 삭제·복원, title/status 같은 관계형 metadata, resource 복제는 CRDT 외의 서버 명령이며 idempotency key와 명시적 version을 사용한다. 문서 접근은 최초 연결과 재인증 시 모두 owner를 확인한다.

## 사건 흐름과 철회

기기 A/B가 같은 한글 문서를 열고 각각 편집하면 로컬 update를 먼저 보존하고 서버에서 교환해 두 문서가 수렴한다. IME composition 중간값은 확정 update로 취급하지 않는다. 연결이 끊기면 로컬 update queue를 유지하고 재인증 뒤 동기화한다.

CRDT를 철회할 때 마지막 평문 projection과 update snapshot을 보관해 수동 충돌 모델로 이관한다. 다중 사용자 확장은 새 PROD/ADR과 권한 migration 없이는 허용하지 않는다.
