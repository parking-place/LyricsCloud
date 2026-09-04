# Resource와 song 데이터 모델

0.2.0 Phase 1의 물리 schema 원본은 [`0200_resources_songs.sql`](../../packages/database/migrations/0200_resources_songs.sql)이다.

## 관계와 불변식

- `resources`는 모든 편집 자료의 UUID, 내부 `owner_id`, 종류, 제목, 즐겨찾기·핀·색상, 버전과 생성·수정·삭제 시각을 가진다.
- `songs.resource_id`는 PK이며 내부 생성 discriminator를 포함한 `(resource_id, owner_id, resource_type='song')`가 같은 resource를 참조한다.
- `type='song'`인 resource의 내부 생성 FK와 song의 역방향 FK는 트랜잭션 종료 시 반드시 서로 하나씩 존재하게 한다. 따라서 생성은 두 행을 같은 트랜잭션에 넣는다.
- 다른 subtype은 해당 버전의 migration이 생기기 전까지 type 값만 예약되어 있으며 song 행을 가질 수 없다.
- 모든 조회·삽입·수정은 `lyricscloud_app` 역할과 transaction-local `app.user_id`를 사용하고 두 테이블 모두 강제 RLS를 적용한다.
- 애플리케이션 역할에는 hard delete와 시각·버전 직접 쓰기 권한이 없다.

## 저장 값 계약

| 항목 | 값·기본값 | 제약 |
|---|---|---|
| resource type | `song`, `lyrics`, `rhyme_note`, `prompt`, `template` | 현재 구현 subtype은 `song`만 해당 |
| title | 필수 문자열 | DB가 앞뒤 공백 제거, 1~200자 |
| color | `null`, `red`, `yellow`, `green`, `blue`, `gray` | 의미는 사용자 선택이며 UI는 텍스트 이름을 함께 표시 |
| pin | 기본 `false` | 고정이면 0 이상의 `pin_order` 필수, 미고정이면 `null` |
| song status | 기본 `idea` | `idea`, `writing_lyrics`, `revising`, `suno_generating`, `mixing`, `completed`, `on_hold` |
| description | 기본 빈 문자열 | 최대 2,000자 |
| work notes | 기본 빈 문자열 | 최대 10,000자 |
| row version | 기본 1 | 업무 필드가 실제로 달라질 때 1 증가 |
| timestamps | DB `timestamptz` | 생성 시 DB 시각, 실제 resource·song 업무 변경 시에만 `updated_at` 갱신 |

상태의 한국어 표기와 API validation이 공유할 값은 [`resource-contract.ts`](../../packages/domain/src/resource-contract.ts)에 있다. SQL check는 우회 호출도 같은 범위를 지키게 한다.

## 활성 곡 조회와 index

모든 기본 곡 목록은 `owner_id = app_current_user_id()`, `type = 'song'`, `deleted_at is null`을 포함한다.

- 최근 수정: `updated_at desc, id desc` → `resources_owner_active_updated_idx`
- 제목: `title, id` → `resources_owner_active_title_idx`
- 핀 우선: `is_pinned desc, pin_order, updated_at desc, id desc` → `resources_owner_active_pin_idx`

## 삭제와 복구

`soft_delete_song(uuid)`은 현재 owner의 활성 song resource만 DB 시각으로 표시하고 두 행을 남긴다. 재호출과 미소유 UUID는 `false`이며 다른 자료를 바꾸지 않는다. 자세한 미래 cascade·복원 의미는 [PROD-0010](../product/PROD-0010-soft-delete-restore.md)을 따른다.

복구용 down SQL은 [`rollback/0200_resources_songs.sql`](../../packages/database/rollback/0200_resources_songs.sql)에 있다. 이는 데이터가 사라지는 절차이므로 disposable DB 또는 검증된 백업 복원본에서만 실행한다. 운영에서는 먼저 백업을 복원하고 후속 migration 의존성이 없는지 확인한다.
