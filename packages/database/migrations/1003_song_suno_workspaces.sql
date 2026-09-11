create table song_suno_workspaces (
  song_resource_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('song'::text) stored,
  model_label text,
  row_version bigint not null default 0 check (row_version >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  constraint song_suno_workspaces_owner_identity unique (song_resource_id,owner_id),
  constraint song_suno_workspaces_resource_fk foreign key (song_resource_id,owner_id,resource_type)
    references resources(id,owner_id,type) on delete cascade deferrable initially deferred,
  constraint song_suno_workspaces_model_length check (model_label is null or char_length(model_label) between 1 and 64)
);

create table song_suno_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  song_resource_id uuid not null,
  url text not null,
  title text not null default '',
  note text not null default '',
  position smallint not null check (position between 0 and 19),
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint song_suno_links_workspace_fk foreign key (song_resource_id,owner_id)
    references song_suno_workspaces(song_resource_id,owner_id) on delete cascade,
  constraint song_suno_links_url_length check (char_length(url) between 1 and 2048),
  constraint song_suno_links_title_length check (char_length(title) <= 200),
  constraint song_suno_links_note_length check (char_length(note) <= 1000),
  constraint song_suno_links_owner_url_unique unique (owner_id,song_resource_id,url),
  constraint song_suno_links_owner_position_unique unique (owner_id,song_resource_id,position)
    deferrable initially immediate
);

create table song_suno_command_requests (
  owner_id uuid not null,
  song_resource_id uuid not null,
  request_id uuid not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default clock_timestamp(),
  primary key (owner_id,song_resource_id,request_id),
  constraint song_suno_command_requests_workspace_fk foreign key (song_resource_id,owner_id)
    references song_suno_workspaces(song_resource_id,owner_id) on delete cascade
);

create index song_suno_links_sequence_idx on song_suno_links(owner_id,song_resource_id,position,id);
create index song_suno_command_requests_created_idx on song_suno_command_requests(owner_id,song_resource_id,created_at desc);

create function normalize_song_suno_link_write() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
    new.updated_at := new.created_at;
    new.row_version := 1;
  else
    new.created_at := old.created_at;
    if row(new.url,new.title,new.note,new.position) is distinct from row(old.url,old.title,old.note,old.position) then
      new.updated_at := clock_timestamp();
      new.row_version := old.row_version + 1;
    else
      new.updated_at := old.updated_at;
      new.row_version := old.row_version;
    end if;
  end if;
  return new;
end
$$;

revoke all on function normalize_song_suno_link_write() from public;
create trigger song_suno_links_normalize_and_version before insert or update on song_suno_links
for each row execute function normalize_song_suno_link_write();

grant select,insert,update on song_suno_workspaces to lyricscloud_app;
grant select,insert,update,delete on song_suno_links to lyricscloud_app;
grant select,insert on song_suno_command_requests to lyricscloud_app;

alter table song_suno_workspaces enable row level security;
alter table song_suno_workspaces force row level security;
alter table song_suno_links enable row level security;
alter table song_suno_links force row level security;
alter table song_suno_command_requests enable row level security;
alter table song_suno_command_requests force row level security;

create policy song_suno_workspaces_owner_all on song_suno_workspaces for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy song_suno_links_owner_all on song_suno_links for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy song_suno_command_requests_owner_select on song_suno_command_requests for select to lyricscloud_app
  using (owner_id=app_current_user_id());
create policy song_suno_command_requests_owner_insert on song_suno_command_requests for insert to lyricscloud_app
  with check (owner_id=app_current_user_id());

comment on table song_suno_workspaces is 'LyricsCloud-only manual Suno model metadata and aggregate CAS version per song.';
comment on table song_suno_links is 'Owner-authored Suno work links; no outbound metadata lookup or provider mutation.';
comment on table song_suno_command_requests is 'Payload-hash idempotency ledger with the exact original aggregate response.';
