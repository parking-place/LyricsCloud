alter table lyric_read_grants
  add column write_enabled boolean not null default false,
  add column write_epoch bigint not null default 1 check (write_epoch > 0),
  add column write_updated_at timestamptz;

create table lyric_share_access_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null references resources(id) on delete cascade,
  grant_id uuid not null references lyric_read_grants(id) on delete cascade,
  requested_access text not null check (requested_access in ('read','write')),
  resulting_write_epoch bigint not null check (resulting_write_epoch > 0),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id)
);

alter table sync_updates
  add column actor_id uuid,
  add column access_mode text not null default 'owner' check (access_mode in ('owner','write')),
  add column grant_id uuid,
  add column permission_epoch bigint,
  add column write_epoch bigint;

alter table sync_updates add constraint sync_updates_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null and write_epoch is null)
  or
  (access_mode='write' and actor_id is not null and grant_id is not null
    and permission_epoch > 0 and write_epoch > 0)
);

alter table sync_update_receipts
  add column accepted_sequence bigint,
  add column actor_id uuid,
  add column access_mode text not null default 'owner' check (access_mode in ('owner','write')),
  add column grant_id uuid,
  add column permission_epoch bigint,
  add column write_epoch bigint;

alter table sync_update_receipts add constraint sync_receipts_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null and write_epoch is null)
  or
  (access_mode='write' and actor_id is not null and grant_id is not null
    and permission_epoch > 0 and write_epoch > 0)
);

alter table sync_documents
  add column last_actor_id uuid,
  add column last_access_mode text check (last_access_mode in ('owner','write'));

create function app_authorize_selected_lyric_write(
  target_document_key uuid,
  target_grant_id uuid,
  target_permission_epoch bigint,
  target_write_epoch bigint
) returns table (authorized_owner_id uuid, authorized_resource_id uuid)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
declare
  target_actor_id uuid := public.app_current_user_id();
  target_resource_id uuid;
begin
  select d.resource_id into target_resource_id
  from public.sync_documents d
  join public.resources r on r.id=d.resource_id and r.owner_id=d.owner_id
  join public.app_users owner_account on owner_account.id=d.owner_id and owner_account.status='active'
  where d.document_key=target_document_key and d.resource_type='lyrics' and r.deleted_at is null;
  if target_resource_id is null then return; end if;

  perform pg_advisory_xact_lock(hashtextextended('selected-write:' || target_resource_id::text, 0));
  return query
    select g.owner_id,g.resource_id
    from public.lyric_read_grants g
    join public.app_users actor_account on actor_account.id=g.grantee_id and actor_account.status='active'
    where g.id=target_grant_id
      and g.resource_id=target_resource_id
      and g.grantee_id=target_actor_id
      and g.state='active'
      and (g.expires_at is null or g.expires_at>statement_timestamp())
      and g.permission_epoch=target_permission_epoch
      and g.write_enabled
      and g.write_epoch=target_write_epoch
    for update of g;
end
$$;

create function app_selected_lyric_write_receipt(
  target_document_key uuid,
  target_update_id uuid,
  target_grant_id uuid,
  target_permission_epoch bigint,
  target_write_epoch bigint
) returns table (
  authorized_owner_id uuid,
  authorized_resource_id uuid,
  payload_sha256 text,
  accepted_sequence bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select d.owner_id,d.resource_id,r.payload_sha256,r.accepted_sequence
  from public.sync_update_receipts r
  join public.sync_documents d on d.document_key=r.document_key
  where r.document_key=target_document_key
    and r.update_id=target_update_id
    and r.actor_id=public.app_current_user_id()
    and r.access_mode='write'
    and r.grant_id=target_grant_id
    and r.permission_epoch=target_permission_epoch
    and r.write_epoch=target_write_epoch
$$;

revoke all on function app_authorize_selected_lyric_write(uuid,uuid,bigint,bigint) from public;
grant execute on function app_authorize_selected_lyric_write(uuid,uuid,bigint,bigint) to lyricscloud_app;
revoke all on function app_selected_lyric_write_receipt(uuid,uuid,uuid,bigint,bigint) from public;
grant execute on function app_selected_lyric_write_receipt(uuid,uuid,uuid,bigint,bigint) to lyricscloud_app;

grant select,insert on lyric_share_access_requests to lyricscloud_app;
grant update (write_enabled,write_epoch,write_updated_at) on lyric_read_grants to lyricscloud_app;
grant update (last_actor_id,last_access_mode) on sync_documents to lyricscloud_app;
grant usage,select on sequence sync_updates_sequence_seq to lyricscloud_app;

alter table lyric_share_access_requests enable row level security;
alter table lyric_share_access_requests force row level security;
create policy lyric_share_access_requests_owner_all on lyric_share_access_requests
  for all to lyricscloud_app
  using (owner_id=app_current_user_id())
  with check (owner_id=app_current_user_id());
