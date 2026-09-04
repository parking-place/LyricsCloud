create table resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  type text not null check (type in ('song', 'lyrics', 'rhyme_note', 'prompt', 'template')),
  title text not null,
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  pin_order integer,
  color text,
  row_version bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  deleted_at timestamptz,
  song_subtype_id uuid generated always as (case when type = 'song' then id end) stored,
  constraint resources_owner_type_identity unique (id, owner_id, type),
  constraint resources_title_length check (char_length(title) between 1 and 200),
  constraint resources_color_value check (color is null or color in ('red', 'yellow', 'green', 'blue', 'gray')),
  constraint resources_pin_order check (
    (is_pinned and pin_order is not null and pin_order >= 0)
    or (not is_pinned and pin_order is null)
  ),
  constraint resources_row_version_positive check (row_version > 0),
  constraint resources_deleted_after_creation check (deleted_at is null or deleted_at >= created_at)
);

create table songs (
  resource_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('song'::text) stored,
  status text not null default 'idea',
  description text not null default '',
  work_notes text not null default '',
  constraint songs_resource_owner_type_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint songs_status_value check (
    status in ('idea', 'writing_lyrics', 'revising', 'suno_generating', 'mixing', 'completed', 'on_hold')
  ),
  constraint songs_description_length check (char_length(description) <= 2000),
  constraint songs_work_notes_length check (char_length(work_notes) <= 10000)
);

alter table resources
  add constraint resources_song_subtype_fk foreign key (song_subtype_id)
  references songs(resource_id) deferrable initially deferred;

create index resources_owner_active_updated_idx
  on resources (owner_id, type, updated_at desc, id desc)
  where deleted_at is null;
create index resources_owner_active_title_idx
  on resources (owner_id, type, title, id)
  where deleted_at is null;
create index resources_owner_active_pin_idx
  on resources (owner_id, type, is_pinned desc, pin_order, updated_at desc, id desc)
  where deleted_at is null;
create index songs_owner_resource_idx on songs (owner_id, resource_id);

create function normalize_resource_write() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.title := regexp_replace(new.title, '^[[:space:]]+|[[:space:]]+$', '', 'g');

  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    new.updated_at := new.created_at;
    new.row_version := 1;
  else
    new.created_at := old.created_at;
    if row(new.owner_id, new.type, new.title, new.is_favorite, new.is_pinned, new.pin_order, new.color, new.deleted_at)
       is distinct from
       row(old.owner_id, old.type, old.title, old.is_favorite, old.is_pinned, old.pin_order, old.color, old.deleted_at) then
      new.updated_at := clock_timestamp();
      new.row_version := old.row_version + 1;
    elsif pg_trigger_depth() > 1 and new.updated_at is distinct from old.updated_at then
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

create trigger resources_normalize_and_version
before insert or update on resources
for each row execute function normalize_resource_write();

create function touch_resource_after_song_change() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  update public.resources
  set updated_at = clock_timestamp()
  where id = new.resource_id and owner_id = new.owner_id and type = 'song';
  return new;
end
$$;

revoke all on function touch_resource_after_song_change() from public;

create trigger songs_touch_resource
after update of status, description, work_notes on songs
for each row
when (row(old.status, old.description, old.work_notes) is distinct from row(new.status, new.description, new.work_notes))
execute function touch_resource_after_song_change();

create function soft_delete_song(target_resource_id uuid) returns boolean
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  changed boolean;
begin
  update public.resources as resource
  set deleted_at = statement_timestamp()
  where resource.id = target_resource_id
    and resource.owner_id = public.app_current_user_id()
    and resource.type = 'song'
    and resource.deleted_at is null
    and exists (
      select 1 from public.songs as song
      where song.resource_id = resource.id and song.owner_id = resource.owner_id
    )
  returning true into changed;

  return coalesce(changed, false);
end
$$;

revoke all on function soft_delete_song(uuid) from public;
grant execute on function soft_delete_song(uuid) to lyricscloud_app;

grant select on resources, songs to lyricscloud_app;
grant insert (id, owner_id, type, title, is_favorite, is_pinned, pin_order, color) on resources to lyricscloud_app;
grant update (title, is_favorite, is_pinned, pin_order, color, deleted_at, updated_at) on resources to lyricscloud_app;
grant insert (resource_id, owner_id, status, description, work_notes) on songs to lyricscloud_app;
grant update (status, description, work_notes) on songs to lyricscloud_app;

alter table resources enable row level security;
alter table resources force row level security;
alter table songs enable row level security;
alter table songs force row level security;

create policy resources_owner_select on resources
  for select to lyricscloud_app
  using (owner_id = app_current_user_id());
create policy resources_owner_insert on resources
  for insert to lyricscloud_app
  with check (owner_id = app_current_user_id());
create policy resources_owner_update on resources
  for update to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());

create policy songs_owner_select on songs
  for select to lyricscloud_app
  using (owner_id = app_current_user_id());
create policy songs_owner_insert on songs
  for insert to lyricscloud_app
  with check (owner_id = app_current_user_id());
create policy songs_owner_update on songs
  for update to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
