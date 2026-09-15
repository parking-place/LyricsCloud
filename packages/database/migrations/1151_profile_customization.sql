-- Preserve pre-1.1.7a effective values without guessing whether they were
-- provider data or a manual edit. The source becomes explicit on first edit/reset.
alter table user_profiles
  add column provider_display_name text not null default '',
  add column provider_avatar_url text,
  add column display_name_override text,
  add column display_name_source text not null default 'legacy_unclassified',
  add column avatar_source text not null default 'legacy_unclassified',
  add column row_version bigint not null default 1,
  add column avatar_photo_id uuid;

alter table user_profiles
  add constraint user_profiles_name_source_check
    check (display_name_source in ('legacy_unclassified','provider','override')),
  add constraint user_profiles_avatar_source_check
    check (avatar_source in ('legacy_unclassified','provider','override')),
  add constraint user_profiles_name_override_check
    check (display_name_override is null or (char_length(display_name_override) between 1 and 120)),
  add constraint user_profiles_provider_avatar_check
    check (provider_avatar_url is null or char_length(provider_avatar_url) <= 2048),
  add constraint user_profiles_name_consistency_check
    check ((display_name_source = 'override') = (display_name_override is not null));

update user_profiles p set
  provider_display_name = coalesce(i.display_name, ''),
  provider_avatar_url = i.avatar_url
from lateral (
  select owner_id, display_name, avatar_url from (
    select user_id owner_id, display_name, avatar_url,
      row_number() over (partition by user_id order by last_login_at desc, issuer, subject) rank
    from auth_identities
  ) latest where rank = 1
) i
where p.owner_id = i.owner_id;

create table profile_avatar_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  webp_bytes bytea not null,
  content_sha256 text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  check (octet_length(webp_bytes) between 1 and 204800),
  check (content_sha256 ~ '^[0-9a-f]{64}$')
);

alter table user_profiles
  add constraint user_profiles_avatar_photo_owner_fk
    foreign key (owner_id, avatar_photo_id)
    references profile_avatar_photos(owner_id, id);

grant select, insert, delete on profile_avatar_photos to lyricscloud_app;
alter table profile_avatar_photos enable row level security;
alter table profile_avatar_photos force row level security;
create policy profile_avatar_photos_owner_policy on profile_avatar_photos
  for all to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
