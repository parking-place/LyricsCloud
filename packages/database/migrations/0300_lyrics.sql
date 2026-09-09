-- Independent named lyrics. CRDT and revision persistence belong to 0.3.1.
alter table resources add column deletion_batch_id uuid;
alter table resources add column lyrics_subtype_id uuid
  generated always as (case when type = 'lyrics' then id end) stored;
alter table songs add constraint songs_resource_owner_identity unique (resource_id, owner_id);

create table lyrics (
  resource_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('lyrics'::text) stored,
  song_id uuid not null,
  body text not null default '',
  memo text not null default '',
  status text not null default 'draft',
  constraint lyrics_resource_owner_type_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint lyrics_song_owner_fk foreign key (song_id, owner_id)
    references songs(resource_id, owner_id) on delete cascade deferrable initially deferred,
  constraint lyrics_body_length check (char_length(body) <= 100000),
  constraint lyrics_memo_length check (char_length(memo) <= 10000),
  constraint lyrics_status_value check (status in ('draft', 'revising', 'final', 'on_hold'))
);
alter table resources add constraint resources_lyrics_subtype_fk foreign key (lyrics_subtype_id)
  references lyrics(resource_id) deferrable initially deferred;
create index lyrics_owner_song_resource_idx on lyrics(owner_id, song_id, resource_id);
create index resources_deletion_batch_idx on resources(owner_id, deletion_batch_id)
  where deleted_at is not null and deletion_batch_id is not null;

-- Parent row lock serializes creation with soft_delete_song. The same lock is
-- taken before all service mutations so deleted parents never gain active children.
create function require_active_lyric_song() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  perform 1 from public.resources r join public.songs s
    on s.resource_id = r.id and s.owner_id = r.owner_id
    where r.id = new.song_id and r.owner_id = new.owner_id
      and r.type = 'song' and r.deleted_at is null for update of r;
  if not found then raise exception 'LYRIC_SONG_UNAVAILABLE' using errcode = '23503'; end if;
  return new;
end
$$;
revoke all on function require_active_lyric_song() from public;
create trigger lyrics_active_song before insert or update of song_id, owner_id on lyrics
  for each row execute function require_active_lyric_song();

create function touch_resource_after_lyric_change() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  update public.resources set updated_at = clock_timestamp()
    where id = new.resource_id and owner_id = new.owner_id and type = 'lyrics';
  return new;
end
$$;
revoke all on function touch_resource_after_lyric_change() from public;
create trigger lyrics_touch_resource after update of body, memo, status on lyrics
  for each row when (row(old.body, old.memo, old.status) is distinct from row(new.body, new.memo, new.status))
  execute function touch_resource_after_lyric_change();

create table lyric_create_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null unique,
  resource_type text generated always as ('lyrics'::text) stored,
  operation text not null check (operation in ('create', 'duplicate')),
  source_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id),
  constraint lyric_create_requests_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred
);

create or replace function soft_delete_song(target_resource_id uuid) returns boolean
language plpgsql set search_path = pg_catalog, public as $$
declare batch_id uuid := gen_random_uuid(); deletion_time timestamptz;
begin
  perform 1 from public.resources r join public.songs s on s.resource_id = r.id and s.owner_id = r.owner_id
    where r.id = target_resource_id and r.owner_id = public.app_current_user_id()
      and r.type = 'song' and r.deleted_at is null for update of r;
  if not found then return false; end if;
  -- Use clock time after acquiring the lock: a concurrent child may have been
  -- created while this transaction waited and must not predate its deletion.
  deletion_time := clock_timestamp();
  update public.resources set deleted_at = deletion_time, deletion_batch_id = batch_id
    where id = target_resource_id and owner_id = public.app_current_user_id();
  update public.resources r set deleted_at = deletion_time, deletion_batch_id = batch_id
    from public.lyrics l where l.resource_id = r.id and l.owner_id = r.owner_id
      and l.song_id = target_resource_id and r.owner_id = public.app_current_user_id()
      and r.type = 'lyrics' and r.deleted_at is null;
  return true;
end
$$;

grant update (deletion_batch_id) on resources to lyricscloud_app;
grant select on lyrics to lyricscloud_app;
grant insert (resource_id, owner_id, song_id, body, memo, status) on lyrics to lyricscloud_app;
grant update (body, memo, status) on lyrics to lyricscloud_app;
grant select, insert on lyric_create_requests to lyricscloud_app;
alter table lyrics enable row level security;
alter table lyrics force row level security;
alter table lyric_create_requests enable row level security;
alter table lyric_create_requests force row level security;
create policy lyrics_owner_select on lyrics for select to lyricscloud_app using (owner_id = app_current_user_id());
create policy lyrics_owner_insert on lyrics for insert to lyricscloud_app with check (owner_id = app_current_user_id());
create policy lyrics_owner_update on lyrics for update to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy lyric_create_requests_owner_select on lyric_create_requests for select to lyricscloud_app using (owner_id = app_current_user_id());
create policy lyric_create_requests_owner_insert on lyric_create_requests for insert to lyricscloud_app with check (owner_id = app_current_user_id());
