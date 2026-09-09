create table recent_items (
  owner_id uuid not null references app_users(id) on delete cascade,
  resource_id uuid not null,
  resource_type text not null check (resource_type in ('song', 'lyrics', 'rhyme_note', 'prompt')),
  last_opened_at timestamptz not null default clock_timestamp(),
  cursor_offset integer,
  songform_label text,
  songform_occurrence integer,
  scroll_top integer,
  viewport text,
  position_saved_at timestamptz,
  position_basis_updated_at timestamptz,
  primary key (owner_id, resource_id),
  constraint recent_items_resource_owner_type_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint recent_items_location_shape check (
    (cursor_offset is null and songform_label is null and songform_occurrence is null
      and scroll_top is null and viewport is null and position_saved_at is null and position_basis_updated_at is null)
    or
    (resource_type = 'lyrics' and cursor_offset between 0 and 100000
      and ((songform_label is null and songform_occurrence is null)
        or (char_length(songform_label) between 1 and 200 and songform_occurrence between 1 and 10000))
      and scroll_top between 0 and 10000000 and viewport in ('desktop', 'mobile')
      and position_saved_at is not null and position_basis_updated_at is not null)
  )
);

create index recent_items_owner_opened_idx
  on recent_items(owner_id, last_opened_at desc, resource_type, resource_id);

comment on table recent_items is
  'One content-free resume row per owner/resource; this is not an analytics event log.';
comment on column recent_items.songform_label is
  'Song-form marker label only. Never store body excerpts or surrounding text.';

grant select on recent_items to lyricscloud_app;
grant insert (owner_id, resource_id, resource_type, last_opened_at, cursor_offset, songform_label,
  songform_occurrence, scroll_top, viewport, position_saved_at, position_basis_updated_at)
  on recent_items to lyricscloud_app;
grant update (last_opened_at, cursor_offset, songform_label, songform_occurrence, scroll_top,
  viewport, position_saved_at, position_basis_updated_at)
  on recent_items to lyricscloud_app;

alter table recent_items enable row level security;
alter table recent_items force row level security;
create policy recent_items_owner_select on recent_items for select to lyricscloud_app
  using (owner_id = app_current_user_id());
create policy recent_items_owner_insert on recent_items for insert to lyricscloud_app
  with check (owner_id = app_current_user_id());
create policy recent_items_owner_update on recent_items for update to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
