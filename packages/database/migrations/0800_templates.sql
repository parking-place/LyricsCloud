create function template_prompt_tokens_valid(value text[]) returns boolean
language sql immutable strict as $$
  select cardinality(value) <= 200 and not exists(
    select 1 from unnest(value) token where token is null or char_length(btrim(token)) not between 1 and 200
  )
$$;

create table templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references app_users(id) on delete cascade,
  type text not null check (type in ('lyrics','prompt')),
  title text not null check (char_length(title) between 1 and 200 and btrim(title) <> ''),
  lyric_body text,
  prompt_tokens text[],
  row_version bigint not null default 1 check (row_version >= 1),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint templates_payload_matches_type check (
    (type='lyrics' and lyric_body is not null and prompt_tokens is null and char_length(lyric_body) <= 100000)
    or (type='prompt' and lyric_body is null and prompt_tokens is not null and template_prompt_tokens_valid(prompt_tokens))
  )
);

create index templates_visible_list_idx on templates(type,owner_id,updated_at desc,id)
  where deleted_at is null;

create table template_preferences (
  owner_id uuid not null references app_users(id) on delete cascade,
  template_id uuid not null references templates(id) on delete cascade,
  is_favorite boolean not null default false,
  use_count bigint not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key(owner_id,template_id)
);

create table template_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  operation text not null check (operation in ('create','duplicate','apply')),
  request_sha256 text not null check (char_length(request_sha256)=64),
  result_id uuid not null,
  result_type text not null check (result_type in ('template','lyrics','prompt')),
  created_at timestamptz not null default clock_timestamp(),
  primary key(owner_id,request_id)
);

insert into templates(id,owner_id,type,title,lyric_body,prompt_tokens) values
  ('08000000-0000-4000-8000-000000000001',null,'lyrics','기본 송폼','[Intro]\n\n[Verse]\n\n[Pre-Chorus]\n\n[Chorus]\n\n[Verse]\n\n[Chorus]\n\n[Outro]',null),
  ('08000000-0000-4000-8000-000000000002',null,'lyrics','간결한 Verse · Hook','[Verse]\n\n[Hook]\n\n[Verse]\n\n[Hook]',null),
  ('08000000-0000-4000-8000-000000000003',null,'prompt','따뜻한 팝',null,array['Warm pop','Emotional vocal','Clean production']),
  ('08000000-0000-4000-8000-000000000004',null,'prompt','몽환적인 전자음악',null,array['Dream pop','Ethereal synth','Atmospheric','Female vocal']);

grant select on templates to lyricscloud_app;
grant insert (id,owner_id,type,title,lyric_body,prompt_tokens) on templates to lyricscloud_app;
grant update (title,lyric_body,prompt_tokens,row_version,updated_at,deleted_at) on templates to lyricscloud_app;
grant select,insert,update,delete on template_preferences to lyricscloud_app;
grant select,insert on template_requests to lyricscloud_app;

alter table templates enable row level security;
alter table templates force row level security;
alter table template_preferences enable row level security;
alter table template_preferences force row level security;
alter table template_requests enable row level security;
alter table template_requests force row level security;

create policy templates_visible_select on templates for select to lyricscloud_app
  using (owner_id is null or owner_id=app_current_user_id());
create policy templates_owner_insert on templates for insert to lyricscloud_app
  with check (owner_id=app_current_user_id());
create policy templates_owner_update on templates for update to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy template_preferences_owner_all on template_preferences for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy template_requests_owner_all on template_requests for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());

comment on table templates is 'Read-only built-in and owner-only reusable lyric or prompt snapshots. Payload is copied into a new resource on apply.';
