create table user_settings (
  owner_id uuid primary key references app_users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  writing_font text not null default 'sans' check (writing_font in ('sans','serif','mono')),
  font_size smallint not null default 18 check (font_size between 14 and 28),
  line_height double precision not null default 1.8 check (line_height between 1.2 and 2.4),
  letter_spacing double precision not null default 0 check (letter_spacing between -0.05 and 0.2),
  focus_mode_default boolean not null default false,
  row_version bigint not null default 1 check (row_version >= 1),
  updated_at timestamptz not null default clock_timestamp()
);

create table lyric_display_settings (
  lyric_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('lyrics'::text) stored,
  writing_font text not null check (writing_font in ('sans','serif','mono')),
  font_size smallint not null check (font_size between 14 and 28),
  line_height double precision not null check (line_height between 1.2 and 2.4),
  letter_spacing double precision not null check (letter_spacing between -0.05 and 0.2),
  row_version bigint not null default 1 check (row_version >= 1),
  updated_at timestamptz not null default clock_timestamp(),
  constraint lyric_display_settings_resource_fk foreign key (lyric_id,owner_id,resource_type)
    references resources(id,owner_id,type) on delete cascade deferrable initially deferred
);

grant select,insert,update on user_settings to lyricscloud_app;
grant select,insert,update,delete on lyric_display_settings to lyricscloud_app;

alter table user_settings enable row level security;
alter table user_settings force row level security;
alter table lyric_display_settings enable row level security;
alter table lyric_display_settings force row level security;

create policy user_settings_owner_all on user_settings for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());
create policy lyric_display_settings_owner_all on lyric_display_settings for all to lyricscloud_app
  using (owner_id=app_current_user_id()) with check (owner_id=app_current_user_id());

comment on table lyric_display_settings is 'Optional per-lyric writing display override. Deleting the row immediately restores account defaults.';
