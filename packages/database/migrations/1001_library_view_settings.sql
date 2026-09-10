create table library_view_settings (
  owner_id uuid not null references app_users(id) on delete cascade,
  resource_type text not null check (resource_type in ('songs','rhymes','prompts')),
  view_mode text not null default 'list' check (view_mode in ('list','grid-small','grid-medium','grid-large')),
  row_version bigint not null default 1 check (row_version >= 1),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner_id,resource_type)
);

grant select,insert,update on library_view_settings to lyricscloud_app;

alter table library_view_settings enable row level security;
alter table library_view_settings force row level security;

create policy library_view_settings_owner_all on library_view_settings for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());

comment on table library_view_settings is 'Per-owner and per-library view preference, isolated from writing display settings and resource ordering.';
