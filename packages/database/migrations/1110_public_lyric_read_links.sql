create table lyric_public_read_links (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  owner_id uuid not null,
  resource_type text generated always as ('lyrics'::text) stored,
  token_digest text not null unique check (token_digest ~ '^[0-9a-f]{64}$'),
  state text not null default 'active' check (state in ('active','revoked')),
  permission_epoch bigint not null check (permission_epoch > 0),
  show_owner_display_name boolean not null default false,
  show_status boolean not null default false,
  show_updated_at boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  rotated_at timestamptz,
  constraint lyric_public_read_links_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade,
  constraint lyric_public_read_links_state_time check (
    (state = 'active' and revoked_at is null) or
    (state = 'revoked' and revoked_at is not null)
  )
);

create unique index lyric_public_read_links_one_active_idx
  on lyric_public_read_links(resource_id) where state = 'active';
create index lyric_public_read_links_owner_resource_idx
  on lyric_public_read_links(owner_id, resource_id, created_at desc);

create table lyric_public_link_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null,
  link_id uuid not null references lyric_public_read_links(id) on delete cascade,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id)
);

create function app_public_lyric_projection(target_digest text)
returns table (
  link_id uuid, resource_id uuid, document_key uuid, title text, body text,
  status text, updated_at timestamptz, owner_display_name text,
  permission_epoch bigint, expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select link.id, r.id, d.document_key, r.title, l.body,
    case when link.show_status then l.status else null end,
    case when link.show_updated_at then r.updated_at else null end,
    case when link.show_owner_display_name then
      case
        when btrim(p.display_name) = '' or position('@' in p.display_name) > 0
          or p.display_name ~* '^[0-9a-f-]{36}$' then '공유자'
        else left(btrim(p.display_name), 60)
      end
    else null end,
    link.permission_epoch, link.expires_at
  from public.lyric_public_read_links link
  join public.resources r on r.id = link.resource_id and r.owner_id = link.owner_id
    and r.type = 'lyrics' and r.deleted_at is null
  join public.lyrics l on l.resource_id = r.id and l.owner_id = r.owner_id
  join public.app_users owner_account on owner_account.id = r.owner_id and owner_account.status = 'active'
  join public.user_profiles p on p.owner_id = r.owner_id
  left join public.sync_documents d on d.resource_id = r.id and d.owner_id = r.owner_id
  where link.token_digest = target_digest
    and link.state = 'active'
    and link.expires_at > statement_timestamp()
$$;

create function app_public_lyric_document(target_digest text, target_link_id uuid)
returns table (
  document_key uuid, resource_id uuid, owner_id uuid, snapshot bytea,
  snapshot_sequence bigint, permission_epoch bigint, expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select d.document_key, d.resource_id, d.owner_id, d.snapshot,
    d.snapshot_sequence, link.permission_epoch, link.expires_at
  from public.lyric_public_read_links link
  join public.resources r on r.id = link.resource_id and r.owner_id = link.owner_id
    and r.type = 'lyrics' and r.deleted_at is null
  join public.app_users owner_account on owner_account.id = r.owner_id and owner_account.status = 'active'
  join public.sync_documents d on d.resource_id = r.id and d.owner_id = r.owner_id
    and d.resource_type = 'lyrics'
  where link.id = target_link_id and link.token_digest = target_digest
    and link.state = 'active' and link.expires_at > statement_timestamp()
$$;

create function app_public_lyric_updates(target_digest text, target_link_id uuid, target_document_key uuid)
returns table (sequence bigint, payload bytea)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select u.sequence, u.payload
  from public.lyric_public_read_links link
  join public.sync_documents d on d.resource_id = link.resource_id and d.owner_id = link.owner_id
  join public.sync_updates u on u.document_key = d.document_key
  join public.resources r on r.id = link.resource_id and r.owner_id = link.owner_id
    and r.deleted_at is null and r.type = 'lyrics'
  join public.app_users owner_account on owner_account.id = r.owner_id and owner_account.status = 'active'
  where link.id = target_link_id and link.token_digest = target_digest
    and d.document_key = target_document_key
    and link.state = 'active' and link.expires_at > statement_timestamp()
  order by u.sequence
$$;

create function app_public_lyric_access(
  target_digest text, target_link_id uuid, target_document_key uuid, target_epoch bigint
) returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select exists (
    select 1 from public.lyric_public_read_links link
    join public.sync_documents d on d.resource_id = link.resource_id and d.owner_id = link.owner_id
    join public.resources r on r.id = link.resource_id and r.owner_id = link.owner_id
    join public.app_users owner_account on owner_account.id = r.owner_id and owner_account.status = 'active'
    where link.id = target_link_id and link.token_digest = target_digest
      and d.document_key = target_document_key and link.permission_epoch = target_epoch
      and link.state = 'active' and link.expires_at > statement_timestamp()
      and r.type = 'lyrics' and r.deleted_at is null
  )
$$;

revoke all on function app_public_lyric_projection(text) from public;
revoke all on function app_public_lyric_document(text,uuid) from public;
revoke all on function app_public_lyric_updates(text,uuid,uuid) from public;
revoke all on function app_public_lyric_access(text,uuid,uuid,bigint) from public;
grant execute on function app_public_lyric_projection(text) to lyricscloud_app;
grant execute on function app_public_lyric_document(text,uuid) to lyricscloud_app;
grant execute on function app_public_lyric_updates(text,uuid,uuid) to lyricscloud_app;
grant execute on function app_public_lyric_access(text,uuid,uuid,bigint) to lyricscloud_app;

grant select on lyric_public_read_links, lyric_public_link_requests to lyricscloud_app;
grant insert (id,resource_id,owner_id,token_digest,state,permission_epoch,
  show_owner_display_name,show_status,show_updated_at,expires_at)
  on lyric_public_read_links to lyricscloud_app;
grant update (state,permission_epoch,revoked_at,rotated_at) on lyric_public_read_links to lyricscloud_app;
grant insert (owner_id,request_id,resource_id,link_id,request_sha256)
  on lyric_public_link_requests to lyricscloud_app;

alter table lyric_public_read_links enable row level security;
alter table lyric_public_read_links force row level security;
alter table lyric_public_link_requests enable row level security;
alter table lyric_public_link_requests force row level security;
create policy lyric_public_read_links_owner_all on lyric_public_read_links
  for all to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
create policy lyric_public_link_requests_owner_all on lyric_public_link_requests
  for all to lyricscloud_app
  using (owner_id = app_current_user_id())
  with check (owner_id = app_current_user_id());
