alter table user_profiles add column sharing_id uuid not null default gen_random_uuid();
alter table user_profiles add constraint user_profiles_sharing_id_unique unique (sharing_id);

create table lyric_read_grants (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  owner_id uuid not null,
  resource_type text generated always as ('lyrics'::text) stored,
  grantee_id uuid not null references app_users(id) on delete cascade,
  state text not null default 'active' check (state in ('active','revoked')),
  permission_epoch bigint not null default 1 check (permission_epoch > 0),
  expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  constraint lyric_read_grants_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade,
  constraint lyric_read_grants_not_owner check (owner_id <> grantee_id),
  constraint lyric_read_grants_state_time check (
    (state = 'active' and revoked_at is null) or
    (state = 'revoked' and revoked_at is not null)
  )
);

create unique index lyric_read_grants_active_recipient_idx
  on lyric_read_grants(resource_id, grantee_id) where state = 'active';
create index lyric_read_grants_grantee_active_idx
  on lyric_read_grants(grantee_id, resource_id, permission_epoch)
  where state = 'active';
create index lyric_read_grants_owner_resource_idx
  on lyric_read_grants(owner_id, resource_id, created_at, id);

create table lyric_share_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null,
  grantee_id uuid not null references app_users(id) on delete cascade,
  grant_id uuid not null references lyric_read_grants(id) on delete cascade,
  requested_expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id)
);

create function app_resolve_active_sharing_id(target_sharing_id uuid) returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select p.owner_id
  from public.user_profiles p
  join public.app_users u on u.id = p.owner_id and u.status = 'active'
  where p.sharing_id = target_sharing_id
$$;

create function app_sharing_identity(target_user_id uuid) returns table (sharing_id uuid, display_name text)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select p.sharing_id, p.display_name
  from public.user_profiles p
  join public.app_users u on u.id = p.owner_id and u.status = 'active'
  where p.owner_id = target_user_id
    and (
      target_user_id = public.app_current_user_id()
      or exists (
        select 1 from public.lyric_read_grants g
        where g.owner_id = public.app_current_user_id()
          and g.grantee_id = target_user_id
      )
      or exists (
        select 1 from public.lyric_read_grants g
        where g.owner_id = target_user_id
          and g.grantee_id = public.app_current_user_id()
          and g.state = 'active'
          and (g.expires_at is null or g.expires_at > statement_timestamp())
      )
    )
$$;

create function app_has_lyric_read_access(target_resource_id uuid) returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select exists (
    select 1
    from public.resources r
    join public.app_users owner_account on owner_account.id = r.owner_id and owner_account.status = 'active'
    join public.lyric_read_grants g on g.resource_id = r.id and g.owner_id = r.owner_id
    where r.id = target_resource_id
      and r.type = 'lyrics'
      and r.deleted_at is null
      and g.grantee_id = public.app_current_user_id()
      and g.state = 'active'
      and (g.expires_at is null or g.expires_at > statement_timestamp())
  )
$$;

revoke all on function app_resolve_active_sharing_id(uuid) from public;
revoke all on function app_sharing_identity(uuid) from public;
revoke all on function app_has_lyric_read_access(uuid) from public;
grant execute on function app_resolve_active_sharing_id(uuid) to lyricscloud_app;
grant execute on function app_sharing_identity(uuid) to lyricscloud_app;
grant execute on function app_has_lyric_read_access(uuid) to lyricscloud_app;

grant select on lyric_read_grants, lyric_share_requests to lyricscloud_app;
grant insert (id,resource_id,owner_id,grantee_id,state,permission_epoch,expires_at)
  on lyric_read_grants to lyricscloud_app;
grant update (state,permission_epoch,revoked_at) on lyric_read_grants to lyricscloud_app;
grant insert (owner_id,request_id,resource_id,grantee_id,grant_id,requested_expires_at)
  on lyric_share_requests to lyricscloud_app;

alter table lyric_read_grants enable row level security;
alter table lyric_read_grants force row level security;
alter table lyric_share_requests enable row level security;
alter table lyric_share_requests force row level security;

create policy lyric_read_grants_owner_select on lyric_read_grants
  for select to lyricscloud_app using (owner_id = app_current_user_id());
create policy lyric_read_grants_recipient_select on lyric_read_grants
  for select to lyricscloud_app using (
    grantee_id = app_current_user_id()
    and state = 'active'
    and (expires_at is null or expires_at > statement_timestamp())
  );
create policy lyric_read_grants_owner_insert on lyric_read_grants
  for insert to lyricscloud_app with check (owner_id = app_current_user_id());
create policy lyric_read_grants_owner_update on lyric_read_grants
  for update to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
create policy lyric_share_requests_owner_all on lyric_share_requests
  for all to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());

create policy resources_selected_lyric_read on resources
  for select to lyricscloud_app
  using (type = 'lyrics' and app_has_lyric_read_access(id));
create policy lyrics_selected_read on lyrics
  for select to lyricscloud_app
  using (app_has_lyric_read_access(resource_id));
create policy sync_documents_selected_lyric_read on sync_documents
  for select to lyricscloud_app
  using (resource_type = 'lyrics' and app_has_lyric_read_access(resource_id));
create policy sync_updates_selected_lyric_read on sync_updates
  for select to lyricscloud_app
  using (exists (
    select 1 from sync_documents d
    where d.document_key = sync_updates.document_key
      and d.resource_type = 'lyrics'
      and app_has_lyric_read_access(d.resource_id)
  ));
