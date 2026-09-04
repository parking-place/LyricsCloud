# 사용자 소유권 데이터 계약

ADR-0003에 따라 모든 개인 자료는 인증 provider 값이 아닌 LyricsCloud 내부 사용자 UUID에 귀속한다. HTTP path·query·body의 `owner_id`, Google 이메일과 provider subject는 소유권 근거가 아니다.

## Schema 규약

향후 사용자 소유 테이블은 다음 조건을 migration에 함께 넣는다.

- `owner_id uuid not null references app_users(id)`
- 사용자 삭제 시 자료 의미에 맞는 명시적 `on delete` 규칙. 개인 profile은 `cascade`를 사용한다.
- `owner_id`가 선두인 index 또는 primary/unique index
- `enable row level security`와 `force row level security`
- `lyricscloud_app` 역할에 필요한 최소 CRUD 권한
- `owner_id = app_current_user_id()`인 `using`과 `with check` 정책

예시:

```sql
create index resource_owner_idx on example_resources(owner_id);
alter table example_resources enable row level security;
alter table example_resources force row level security;
create policy example_resources_owner_policy on example_resources
  for all to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
```

## Transaction 규약

데이터 adapter는 transaction을 시작한 직후 다음 순서로 실행한다.

1. `SET LOCAL ROLE lyricscloud_app`
2. `set_config('app.user_id', <authenticated internal UUID>, true)`
3. 애플리케이션 query의 `where owner_id = <authenticated internal UUID>` 조건
4. commit 또는 rollback

`LOCAL` 설정은 transaction 밖으로 전달하지 않는다. 연결 풀에서 transaction 직후 현재 role과 `app.user_id`가 초기화되는지 A/B 사용자 반복 테스트로 확인한다. 인증 context가 없거나 사용자가 `blocked` 상태면 `app_current_user_id()`가 `NULL`을 반환해 RLS가 기본 거부한다.

## 애플리케이션 규약

- 생성 시 `owner_id`는 인증 session의 내부 UUID에서만 가져온다.
- 읽기·수정·삭제는 repository의 owner 조건과 RLS를 동시에 통과해야 한다.
- 요청 본문의 `owner_id`, `user_id`는 무시하거나 validation 오류로 처리하며 DB 값으로 전달하지 않는다.
- 미소유 ID와 존재하지 않는 ID를 모두 `NOT_FOUND`로 응답한다.
- 거부 오류와 로그에는 상대 사용자의 존재, 이메일, provider subject, 표시 이름이나 창작물 내용을 포함하지 않는다.

0.2.0 생성 API가 소비할 실행 가능한 예제와 필수 회귀 묶음은 [`0.2.0 owner context 인계`](./0.2.0-OWNER-CONTEXT-HANDOFF.md)에 고정한다.

## Profile

`user_profiles.owner_id`가 내부 사용자 ID이자 profile 식별자다. 표시 이름·avatar URL·생성·수정 시각은 profile에 저장하고, 계정 활성 상태는 `app_users.status`를 단일 원본으로 사용한다. 보호된 profile 응답은 활성 사용자에게만 `accountStatus: active`를 반환한다.
