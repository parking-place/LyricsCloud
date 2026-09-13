do $$
begin
  if exists(select 1 from lyric_public_read_links where write_enabled) then
    raise exception '1130 rollback blocked: active public writers exist';
  end if;
  if exists(select 1 from sync_updates where access_mode='public-write')
    or exists(select 1 from sync_update_receipts where access_mode='public-write') then
    raise exception '1130 rollback blocked: public guest updates exist';
  end if;
end
$$;

drop function if exists app_public_lyric_projection(text);
drop function if exists app_public_lyric_write_receipt(uuid,uuid,uuid,text,text,bigint,bigint);
drop function if exists app_authorize_public_lyric_write(uuid,uuid,text,text,bigint,bigint,integer);
drop function if exists app_public_guest_session_access(text,uuid,text);
drop function if exists app_issue_public_guest_session(text,text);
drop table if exists lyric_public_write_windows;
drop table if exists lyric_public_access_requests;

alter table sync_documents drop constraint if exists sync_documents_last_access_mode_check;
alter table sync_documents add constraint sync_documents_last_access_mode_check check (last_access_mode in ('owner','write'));
alter table sync_documents drop column if exists last_public_guest_session_id;

alter table sync_update_receipts drop constraint if exists sync_receipts_access_tuple;
alter table sync_update_receipts drop constraint if exists sync_update_receipts_access_mode_check;
alter table sync_update_receipts add constraint sync_update_receipts_access_mode_check check (access_mode in ('owner','write'));
alter table sync_update_receipts add constraint sync_receipts_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null and write_epoch is null)
  or (access_mode='write' and actor_id is not null and grant_id is not null and permission_epoch>0 and write_epoch>0)
);
alter table sync_update_receipts drop column if exists public_guest_session_id;

alter table sync_updates drop constraint if exists sync_updates_access_tuple;
alter table sync_updates drop constraint if exists sync_updates_access_mode_check;
alter table sync_updates add constraint sync_updates_access_mode_check check (access_mode in ('owner','write'));
alter table sync_updates add constraint sync_updates_access_tuple check (
  (access_mode='owner' and grant_id is null and permission_epoch is null and write_epoch is null)
  or (access_mode='write' and actor_id is not null and grant_id is not null and permission_epoch>0 and write_epoch>0)
);
alter table sync_updates drop column if exists public_guest_session_id;

drop table if exists lyric_public_guest_sessions;
alter table lyric_public_read_links
  drop column if exists write_confirmed_at,
  drop column if exists write_epoch,
  drop column if exists write_enabled;
alter table lyric_public_read_links drop constraint if exists lyric_public_read_links_id_resource_unique;

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
      case when btrim(p.display_name)='' or position('@' in p.display_name)>0
        or p.display_name ~* '^[0-9a-f-]{36}$' then '공유자'
      else left(btrim(p.display_name),60) end
    else null end,
    link.permission_epoch,link.expires_at
  from public.lyric_public_read_links link
  join public.resources r on r.id=link.resource_id and r.owner_id=link.owner_id and r.type='lyrics' and r.deleted_at is null
  join public.lyrics l on l.resource_id=r.id and l.owner_id=r.owner_id
  join public.app_users owner_account on owner_account.id=r.owner_id and owner_account.status='active'
  join public.user_profiles p on p.owner_id=r.owner_id
  left join public.sync_documents d on d.resource_id=r.id and d.owner_id=r.owner_id
  where link.token_digest=target_digest and link.state='active' and link.expires_at>statement_timestamp()
$$;
revoke all on function app_public_lyric_projection(text) from public;
grant execute on function app_public_lyric_projection(text) to lyricscloud_app;

delete from schema_migrations where name='1130_public_lyric_guest_write.sql';
