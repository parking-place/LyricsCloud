do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lyricscloud_app') then
    create role lyricscloud_app nologin nosuperuser nocreatedb nocreaterole noinherit;
  end if;
end
$$;

grant lyricscloud_app to current_user;
grant usage on schema public to lyricscloud_app;

create table user_profiles (
  owner_id uuid primary key references app_users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) <= 120),
  check (avatar_url is null or char_length(avatar_url) <= 2048)
);

insert into user_profiles(owner_id, display_name, avatar_url)
select u.id, coalesce(i.display_name, ''), i.avatar_url
from app_users u
left join lateral (
  select display_name, avatar_url
  from auth_identities
  where user_id = u.id
  order by last_login_at desc
  limit 1
) i on true;

create function app_current_user_id() returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select id
  from public.app_users
  where id = nullif(current_setting('app.user_id', true), '')::uuid
    and status = 'active'
$$;

revoke all on function app_current_user_id() from public;
grant execute on function app_current_user_id() to lyricscloud_app;
grant select, insert, update, delete on user_profiles to lyricscloud_app;

alter table user_profiles enable row level security;
alter table user_profiles force row level security;

create policy user_profiles_owner_policy on user_profiles
  for all
  to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
