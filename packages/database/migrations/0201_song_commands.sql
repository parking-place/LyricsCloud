create table song_create_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null unique,
  resource_type text generated always as ('song'::text) stored,
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id),
  constraint song_create_requests_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred
);

grant select, insert on song_create_requests to lyricscloud_app;

alter table song_create_requests enable row level security;
alter table song_create_requests force row level security;

create policy song_create_requests_owner_select on song_create_requests
  for select to lyricscloud_app
  using (owner_id = app_current_user_id());
create policy song_create_requests_owner_insert on song_create_requests
  for insert to lyricscloud_app
  with check (owner_id = app_current_user_id());
