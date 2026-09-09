alter table resources add column rhyme_note_subtype_id uuid
  generated always as (case when type = 'rhyme_note' then id end) stored;

create table rhyme_notes (
  resource_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('rhyme_note'::text) stored,
  body text not null default '',
  constraint rhyme_notes_resource_owner_type_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint rhyme_notes_resource_owner_unique unique (resource_id, owner_id),
  constraint rhyme_notes_body_length check (char_length(body) <= 100000)
);

alter table resources add constraint resources_rhyme_note_subtype_fk foreign key (rhyme_note_subtype_id)
  references rhyme_notes(resource_id) deferrable initially deferred;

create function touch_resource_after_rhyme_note_change() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  update public.resources set updated_at = clock_timestamp()
    where id = new.resource_id and owner_id = new.owner_id and type = 'rhyme_note';
  return new;
end
$$;
revoke all on function touch_resource_after_rhyme_note_change() from public;
create trigger rhyme_notes_touch_resource after update of body on rhyme_notes
  for each row when (old.body is distinct from new.body)
  execute function touch_resource_after_rhyme_note_change();

create table rhyme_note_create_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null unique,
  resource_type text generated always as ('rhyme_note'::text) stored,
  operation text not null check (operation in ('create', 'duplicate')),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id),
  constraint rhyme_note_create_requests_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  display_value text not null,
  normalized_value text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  deleted_at timestamptz,
  constraint tags_owner_identity unique (id, owner_id),
  constraint tags_owner_normalized_unique unique (owner_id, normalized_value),
  constraint tags_display_length check (char_length(display_value) between 1 and 50),
  constraint tags_normalized_length check (char_length(normalized_value) between 1 and 50),
  constraint tags_deleted_after_creation check (deleted_at is null or deleted_at >= created_at)
);

create function normalize_tag_write() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  new.display_value := regexp_replace(normalize(new.display_value, NFC), '[[:space:]]+', ' ', 'g');
  new.display_value := regexp_replace(new.display_value, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  new.normalized_value := lower(new.display_value);
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
    new.updated_at := new.created_at;
  else
    new.created_at := old.created_at;
    if row(new.display_value, new.normalized_value, new.deleted_at)
       is distinct from row(old.display_value, old.normalized_value, old.deleted_at) then
      new.updated_at := clock_timestamp();
    else
      new.updated_at := old.updated_at;
    end if;
  end if;
  return new;
end
$$;
revoke all on function normalize_tag_write() from public;
create trigger tags_normalize before insert or update on tags
  for each row execute function normalize_tag_write();

create table resource_tags (
  owner_id uuid not null,
  resource_id uuid not null,
  resource_type text generated always as ('rhyme_note'::text) stored,
  tag_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, resource_id, tag_id),
  constraint resource_tags_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint resource_tags_tag_fk foreign key (tag_id, owner_id)
    references tags(id, owner_id) on delete cascade deferrable initially deferred
);

create table song_resource_links (
  owner_id uuid not null,
  song_resource_id uuid not null,
  song_resource_type text generated always as ('song'::text) stored,
  linked_resource_id uuid not null,
  linked_resource_type text not null check (linked_resource_type in ('rhyme_note', 'prompt')),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, song_resource_id, linked_resource_id),
  constraint song_resource_links_song_fk foreign key (song_resource_id, owner_id, song_resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint song_resource_links_linked_fk foreign key (linked_resource_id, owner_id, linked_resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint song_resource_links_not_self check (song_resource_id <> linked_resource_id)
);

create function require_active_rhyme_tag_link() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  perform 1 from public.resources where id = new.resource_id and owner_id = new.owner_id
    and type = 'rhyme_note' and deleted_at is null for update;
  if not found then raise exception 'RHYME_NOTE_UNAVAILABLE' using errcode = '23503'; end if;
  perform 1 from public.tags where id = new.tag_id and owner_id = new.owner_id
    and deleted_at is null for update;
  if not found then raise exception 'RHYME_TAG_UNAVAILABLE' using errcode = '23503'; end if;
  return new;
end
$$;
revoke all on function require_active_rhyme_tag_link() from public;
create trigger resource_tags_active before insert or update on resource_tags
  for each row execute function require_active_rhyme_tag_link();

create function require_active_song_resource_link() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  perform 1 from public.resources where id = new.song_resource_id and owner_id = new.owner_id
    and type = 'song' and deleted_at is null for update;
  if not found then raise exception 'SONG_UNAVAILABLE' using errcode = '23503'; end if;
  perform 1 from public.resources where id = new.linked_resource_id and owner_id = new.owner_id
    and type = new.linked_resource_type and deleted_at is null for update;
  if not found then raise exception 'LINKED_RESOURCE_UNAVAILABLE' using errcode = '23503'; end if;
  return new;
end
$$;
revoke all on function require_active_song_resource_link() from public;
create trigger song_resource_links_active before insert or update on song_resource_links
  for each row execute function require_active_song_resource_link();

create function soft_delete_rhyme_note(target_resource_id uuid) returns boolean
language plpgsql set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.resources set deleted_at = clock_timestamp(), deletion_batch_id = gen_random_uuid()
    where id = target_resource_id and owner_id = public.app_current_user_id()
      and type = 'rhyme_note' and deleted_at is null
      and exists (select 1 from public.rhyme_notes where resource_id = target_resource_id and owner_id = public.app_current_user_id())
    returning true into changed;
  return coalesce(changed, false);
end
$$;
revoke all on function soft_delete_rhyme_note(uuid) from public;

alter table sync_documents drop constraint sync_documents_resource_fk;
alter table sync_documents alter column resource_type drop expression;
alter table sync_documents alter column resource_type set default 'lyrics';
alter table sync_documents add constraint sync_documents_resource_type_check
  check (resource_type in ('lyrics', 'rhyme_note'));
alter table sync_documents add constraint sync_documents_resource_fk
  foreign key (resource_id, owner_id, resource_type)
  references resources(id, owner_id, type) on delete cascade deferrable initially deferred;

create index rhyme_notes_owner_resource_idx on rhyme_notes(owner_id, resource_id);
create index tags_owner_active_value_idx on tags(owner_id, normalized_value, id) where deleted_at is null;
create index resource_tags_owner_tag_idx on resource_tags(owner_id, tag_id, resource_id);
create index song_resource_links_owner_linked_idx on song_resource_links(owner_id, linked_resource_id, song_resource_id);

grant select on rhyme_notes, tags, resource_tags, song_resource_links to lyricscloud_app;
grant insert (resource_id, owner_id, body) on rhyme_notes to lyricscloud_app;
grant update (body) on rhyme_notes to lyricscloud_app;
grant select, insert on rhyme_note_create_requests to lyricscloud_app;
grant insert (id, owner_id, display_value, normalized_value) on tags to lyricscloud_app;
grant update (display_value, normalized_value, deleted_at) on tags to lyricscloud_app;
grant insert, delete on resource_tags, song_resource_links to lyricscloud_app;
grant execute on function soft_delete_rhyme_note(uuid) to lyricscloud_app;

alter table rhyme_notes enable row level security;
alter table rhyme_notes force row level security;
alter table rhyme_note_create_requests enable row level security;
alter table rhyme_note_create_requests force row level security;
alter table tags enable row level security;
alter table tags force row level security;
alter table resource_tags enable row level security;
alter table resource_tags force row level security;
alter table song_resource_links enable row level security;
alter table song_resource_links force row level security;

create policy rhyme_notes_owner_all on rhyme_notes for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy rhyme_note_requests_owner_all on rhyme_note_create_requests for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy tags_owner_all on tags for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy resource_tags_owner_all on resource_tags for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy song_resource_links_owner_all on song_resource_links for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());

comment on table lyric_revisions is 'Immutable revisions for owner-only editable CRDT resources; legacy table name retained for migration compatibility.';
