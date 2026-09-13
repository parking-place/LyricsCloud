alter table lyric_public_read_links
  add column write_enabled boolean not null default false,
  add column write_epoch bigint not null default 1 check (write_epoch > 0),
  add column write_confirmed_at timestamptz;
alter table lyric_public_read_links add constraint lyric_public_read_links_id_resource_unique unique (id,resource_id);

create table lyric_public_access_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null references resources(id) on delete cascade,
  link_id uuid not null references lyric_public_read_links(id) on delete cascade,
  requested_access text not null check (requested_access in ('read','write')),
  confirmation_version text check (
    (requested_access='write' and confirmation_version='public-guest-write-v1')
    or (requested_access='read' and confirmation_version is null)
  ),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  resulting_write_epoch bigint not null check (resulting_write_epoch > 0),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id)
);

create table lyric_public_guest_sessions (
  id uuid primary key,
  link_id uuid not null references lyric_public_read_links(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  token_digest text not null unique check (token_digest ~ '^[0-9a-f]{64}$'),
  permission_epoch bigint not null check (permission_epoch > 0),
  write_epoch bigint not null check (write_epoch > 0),
  display_name text not null check (display_name ~ '^게스트-[0-9A-F]{4}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  constraint lyric_public_guest_sessions_link_resource_fk foreign key (link_id,resource_id)
    references lyric_public_read_links(id,resource_id) on delete cascade
);

create index lyric_public_guest_sessions_link_idx
  on lyric_public_guest_sessions(link_id,expires_at) where revoked_at is null;

create table lyric_public_write_windows (
  scope text not null check (scope in ('guest','link')),
  scope_id uuid not null,
  link_id uuid not null references lyric_public_read_links(id) on delete cascade,
  guest_session_id uuid references lyric_public_guest_sessions(id) on delete cascade,
  window_start timestamptz not null,
  update_count integer not null check (update_count > 0),
  byte_count bigint not null check (byte_count > 0),
  primary key (scope,scope_id,window_start),
  check ((scope='guest' and guest_session_id=scope_id) or (scope='link' and guest_session_id is null and link_id=scope_id))
);

alter table sync_updates add column public_guest_session_id uuid references lyric_public_guest_sessions(id) on delete cascade;
alter table sync_updates drop constraint sync_updates_access_tuple;
alter table sync_updates drop constraint sync_updates_access_mode_check;
alter table sync_updates add constraint sync_updates_access_mode_check check (access_mode in ('owner','write','public-write'));
alter table sync_updates add constraint sync_updates_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null
    and write_epoch is null and public_guest_session_id is null)
  or
  (access_mode='write' and actor_id is not null and grant_id is not null and permission_epoch > 0
    and write_epoch > 0 and public_guest_session_id is null)
  or
  (access_mode='public-write' and actor_id is null and grant_id is null and permission_epoch > 0
    and write_epoch > 0 and public_guest_session_id is not null)
);

alter table sync_update_receipts add column public_guest_session_id uuid references lyric_public_guest_sessions(id) on delete cascade;
alter table sync_update_receipts drop constraint sync_receipts_access_tuple;
alter table sync_update_receipts drop constraint sync_update_receipts_access_mode_check;
alter table sync_update_receipts add constraint sync_update_receipts_access_mode_check check (access_mode in ('owner','write','public-write'));
alter table sync_update_receipts add constraint sync_receipts_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null
    and write_epoch is null and public_guest_session_id is null)
  or
  (access_mode='write' and actor_id is not null and grant_id is not null and permission_epoch > 0
    and write_epoch > 0 and public_guest_session_id is null)
  or
  (access_mode='public-write' and actor_id is null and grant_id is null and permission_epoch > 0
    and write_epoch > 0 and public_guest_session_id is not null)
);

alter table sync_documents add column last_public_guest_session_id uuid references lyric_public_guest_sessions(id) on delete set null;
alter table sync_documents drop constraint sync_documents_last_access_mode_check;
alter table sync_documents add constraint sync_documents_last_access_mode_check
  check (last_access_mode in ('owner','write','public-write'));

drop function app_public_lyric_projection(text);
create function app_public_lyric_projection(target_digest text)
returns table (
  link_id uuid, resource_id uuid, document_key uuid, title text, body text,
  status text, updated_at timestamptz, owner_display_name text,
  permission_epoch bigint, write_enabled boolean, write_epoch bigint, expires_at timestamptz
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
    link.permission_epoch,link.write_enabled,link.write_epoch,link.expires_at
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

create function app_issue_public_guest_session(target_digest text, target_session_digest text)
returns table (
  session_id uuid, link_id uuid, resource_id uuid, permission_epoch bigint,
  write_epoch bigint, display_name text, expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  selected_link public.lyric_public_read_links%rowtype;
  new_id uuid := gen_random_uuid();
  new_name text := '게스트-' || upper(substr(replace(new_id::text,'-',''),1,4));
  session_expiry timestamptz;
begin
  select link.* into selected_link
  from public.lyric_public_read_links link
  join public.resources r on r.id=link.resource_id and r.owner_id=link.owner_id
    and r.type='lyrics' and r.deleted_at is null
  join public.app_users owner_account on owner_account.id=link.owner_id and owner_account.status='active'
  where link.token_digest=target_digest and link.state='active' and link.write_enabled
    and link.expires_at>statement_timestamp()
  for update of link;
  if not found then return; end if;
  session_expiry := least(selected_link.expires_at,statement_timestamp()+interval '12 hours');
  insert into public.lyric_public_guest_sessions
    (id,link_id,resource_id,token_digest,permission_epoch,write_epoch,display_name,expires_at)
  values(new_id,selected_link.id,selected_link.resource_id,target_session_digest,
    selected_link.permission_epoch,selected_link.write_epoch,new_name,session_expiry);
  return query select new_id,selected_link.id,selected_link.resource_id,
    selected_link.permission_epoch,selected_link.write_epoch,new_name,session_expiry;
end
$$;

create function app_public_guest_session_access(
  target_link_digest text, target_link_id uuid, target_session_digest text
) returns table (
  document_key uuid, resource_id uuid, owner_id uuid, guest_session_id uuid,
  guest_display_name text, snapshot bytea, snapshot_sequence bigint,
  permission_epoch bigint, write_epoch bigint, expires_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select d.document_key,d.resource_id,d.owner_id,s.id,s.display_name,d.snapshot,d.snapshot_sequence,
    link.permission_epoch,link.write_epoch,least(link.expires_at,s.expires_at)
  from public.lyric_public_read_links link
  join public.lyric_public_guest_sessions s on s.link_id=link.id and s.resource_id=link.resource_id
  join public.sync_documents d on d.resource_id=link.resource_id and d.owner_id=link.owner_id and d.resource_type='lyrics'
  join public.resources r on r.id=link.resource_id and r.owner_id=link.owner_id and r.type='lyrics' and r.deleted_at is null
  join public.app_users owner_account on owner_account.id=link.owner_id and owner_account.status='active'
  where link.id=target_link_id and link.token_digest=target_link_digest
    and s.token_digest=target_session_digest and s.permission_epoch=link.permission_epoch
    and s.write_epoch=link.write_epoch
    and link.state='active' and link.write_enabled and link.expires_at>statement_timestamp()
    and s.revoked_at is null and s.expires_at>statement_timestamp()
$$;

create function app_authorize_public_lyric_write(
  target_document_key uuid, target_link_id uuid, target_link_digest text,
  target_session_digest text, target_permission_epoch bigint, target_write_epoch bigint,
  target_payload_bytes integer
) returns table (
  authorized_owner_id uuid, authorized_resource_id uuid, guest_session_id uuid,
  guest_display_name text, allowed boolean, rate_limited boolean
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  selected_owner uuid; selected_resource uuid; selected_session uuid; selected_name text;
  bucket timestamptz := date_trunc('minute',statement_timestamp());
  guest_count integer; guest_bytes bigint; link_count integer; link_bytes bigint;
begin
  if target_payload_bytes<1 or target_payload_bytes>1048576 then return; end if;
  select d.owner_id,d.resource_id,s.id,s.display_name
    into selected_owner,selected_resource,selected_session,selected_name
  from public.lyric_public_read_links link
  join public.lyric_public_guest_sessions s on s.link_id=link.id and s.resource_id=link.resource_id
  join public.sync_documents d on d.resource_id=link.resource_id and d.owner_id=link.owner_id and d.resource_type='lyrics'
  join public.resources r on r.id=d.resource_id and r.owner_id=d.owner_id and r.deleted_at is null
  join public.app_users owner_account on owner_account.id=d.owner_id and owner_account.status='active'
  where d.document_key=target_document_key and link.id=target_link_id
    and link.token_digest=target_link_digest and s.token_digest=target_session_digest
    and link.permission_epoch=target_permission_epoch and link.write_epoch=target_write_epoch
    and s.permission_epoch=link.permission_epoch and s.write_epoch=link.write_epoch
    and link.state='active' and link.write_enabled
    and link.expires_at>statement_timestamp() and s.revoked_at is null and s.expires_at>statement_timestamp()
  for update of link,s;
  if not found then return; end if;

  insert into public.lyric_public_write_windows(scope,scope_id,link_id,guest_session_id,window_start,update_count,byte_count)
  values('guest',selected_session,target_link_id,selected_session,bucket,1,target_payload_bytes)
  on conflict(scope,scope_id,window_start) do update set
    update_count=lyric_public_write_windows.update_count+1,
    byte_count=lyric_public_write_windows.byte_count+excluded.byte_count
  returning update_count,byte_count into guest_count,guest_bytes;
  insert into public.lyric_public_write_windows(scope,scope_id,link_id,guest_session_id,window_start,update_count,byte_count)
  values('link',target_link_id,target_link_id,null,bucket,1,target_payload_bytes)
  on conflict(scope,scope_id,window_start) do update set
    update_count=lyric_public_write_windows.update_count+1,
    byte_count=lyric_public_write_windows.byte_count+excluded.byte_count
  returning update_count,byte_count into link_count,link_bytes;

  if guest_count>240 or guest_bytes>4194304 or link_count>1200 or link_bytes>16777216 then
    return query select selected_owner,selected_resource,selected_session,selected_name,false,true;
    return;
  end if;
  return query select selected_owner,selected_resource,selected_session,selected_name,true,false;
end
$$;

create function app_public_lyric_write_receipt(
  target_document_key uuid, target_update_id uuid, target_link_id uuid,
  target_link_digest text, target_session_digest text,
  target_permission_epoch bigint, target_write_epoch bigint
) returns table (
  authorized_owner_id uuid, authorized_resource_id uuid, guest_session_id uuid,
  payload_sha256 text, accepted_sequence bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select d.owner_id,d.resource_id,s.id,r.payload_sha256,r.accepted_sequence
  from public.sync_update_receipts r
  join public.sync_documents d on d.document_key=r.document_key
  join public.lyric_public_guest_sessions s on s.id=r.public_guest_session_id
  join public.lyric_public_read_links link on link.id=s.link_id and link.resource_id=s.resource_id
  where r.document_key=target_document_key and r.update_id=target_update_id
    and r.access_mode='public-write' and link.id=target_link_id
    and link.token_digest=target_link_digest and s.token_digest=target_session_digest
    and link.state='active' and link.write_enabled and link.expires_at>statement_timestamp()
    and s.revoked_at is null and s.expires_at>statement_timestamp()
    and s.permission_epoch=link.permission_epoch and s.write_epoch=link.write_epoch
    and r.permission_epoch=target_permission_epoch and r.write_epoch=target_write_epoch
    and target_permission_epoch=link.permission_epoch and target_write_epoch=link.write_epoch
$$;

revoke all on function app_public_lyric_projection(text) from public;
revoke all on function app_issue_public_guest_session(text,text) from public;
revoke all on function app_public_guest_session_access(text,uuid,text) from public;
revoke all on function app_authorize_public_lyric_write(uuid,uuid,text,text,bigint,bigint,integer) from public;
revoke all on function app_public_lyric_write_receipt(uuid,uuid,uuid,text,text,bigint,bigint) from public;
grant execute on function app_public_lyric_projection(text) to lyricscloud_app;
grant execute on function app_issue_public_guest_session(text,text) to lyricscloud_app;
grant execute on function app_public_guest_session_access(text,uuid,text) to lyricscloud_app;
grant execute on function app_authorize_public_lyric_write(uuid,uuid,text,text,bigint,bigint,integer) to lyricscloud_app;
grant execute on function app_public_lyric_write_receipt(uuid,uuid,uuid,text,text,bigint,bigint) to lyricscloud_app;

grant select,insert on lyric_public_access_requests to lyricscloud_app;
grant update (write_enabled,write_epoch,write_confirmed_at) on lyric_public_read_links to lyricscloud_app;
grant update (last_public_guest_session_id) on sync_documents to lyricscloud_app;

alter table lyric_public_access_requests enable row level security;
alter table lyric_public_access_requests force row level security;
create policy lyric_public_access_requests_owner_all on lyric_public_access_requests
  for all to lyricscloud_app
  using (owner_id=app_current_user_id())
  with check (owner_id=app_current_user_id());
