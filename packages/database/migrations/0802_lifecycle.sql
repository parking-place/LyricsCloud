alter table resources add column purge_at timestamptz;
update resources set purge_at=deleted_at+interval '30 days' where deleted_at is not null;
alter table resources add constraint resources_purge_deadline check (
  (deleted_at is null and purge_at is null) or
  (deleted_at is not null and purge_at=deleted_at+interval '30 days')
);
create index resources_owner_trash_idx on resources(owner_id,purge_at,id) where deleted_at is not null;
create index resources_due_purge_idx on resources(purge_at,id) where purge_at is not null;

create function set_resource_purge_deadline() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    new.purge_at := case when new.deleted_at is null then null else new.deleted_at+interval '30 days' end;
  end if;
  return new;
end
$$;
revoke all on function set_resource_purge_deadline() from public;
create trigger resources_set_purge_deadline before update of deleted_at on resources
  for each row execute function set_resource_purge_deadline();

alter table templates add column purge_at timestamptz;
update templates set purge_at=deleted_at+interval '30 days' where deleted_at is not null;
alter table templates add constraint templates_purge_deadline check (
  (deleted_at is null and purge_at is null) or
  (deleted_at is not null and purge_at=deleted_at+interval '30 days')
);
create index templates_owner_trash_idx on templates(owner_id,purge_at,id) where deleted_at is not null;
create index templates_due_purge_idx on templates(purge_at,id) where purge_at is not null;

create function set_template_purge_deadline() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    new.purge_at := case when new.deleted_at is null then null else new.deleted_at+interval '30 days' end;
  end if;
  return new;
end
$$;
revoke all on function set_template_purge_deadline() from public;
create trigger templates_set_purge_deadline before update of deleted_at on templates
  for each row execute function set_template_purge_deadline();

alter table app_users drop constraint app_users_status_check;
alter table app_users add column withdrawal_requested_at timestamptz;
alter table app_users add column withdrawal_purge_at timestamptz;
alter table app_users add constraint app_users_status_check check (status in ('active','blocked','withdrawal_pending'));
alter table app_users add constraint app_users_withdrawal_state check (
  (status='withdrawal_pending' and withdrawal_requested_at is not null and withdrawal_purge_at=withdrawal_requested_at+interval '7 days') or
  (status<>'withdrawal_pending' and withdrawal_requested_at is null and withdrawal_purge_at is null)
);
create index app_users_withdrawal_purge_idx on app_users(withdrawal_purge_at,id) where status='withdrawal_pending';

create table lifecycle_purge_runs (
  id bigint generated always as identity primary key,
  status text not null check (status in ('running','success','failed')),
  started_at timestamptz not null,
  finished_at timestamptz,
  resource_count integer not null default 0 check (resource_count>=0),
  template_count integer not null default 0 check (template_count>=0),
  account_count integer not null default 0 check (account_count>=0),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,80}$'),
  constraint lifecycle_purge_run_state check (
    (status='running' and finished_at is null and error_code is null) or
    (status='success' and finished_at is not null and error_code is null) or
    (status='failed' and finished_at is not null and error_code is not null)
  )
);
create index lifecycle_purge_runs_started_idx on lifecycle_purge_runs(started_at desc,id desc);

create function hard_delete_trashed_resource(target_id uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare target_type text; changed boolean;
begin
  select type into target_type from public.resources where id=target_id
    and owner_id=public.app_current_user_id() and deleted_at is not null for update;
  if not found then return false; end if;
  if target_type='song' then
    delete from public.resources r using public.lyrics l where r.id=l.resource_id and r.owner_id=l.owner_id
      and l.song_id=target_id and r.owner_id=public.app_current_user_id();
  end if;
  delete from public.resources where id=target_id and owner_id=public.app_current_user_id() returning true into changed;
  return coalesce(changed,false);
end
$$;
revoke all on function hard_delete_trashed_resource(uuid) from public;
grant execute on function hard_delete_trashed_resource(uuid) to lyricscloud_app;

create function hard_delete_trashed_template(target_id uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare changed boolean;
begin
  delete from public.templates where id=target_id and owner_id=public.app_current_user_id() and deleted_at is not null
    returning true into changed;
  return coalesce(changed,false);
end
$$;
revoke all on function hard_delete_trashed_template(uuid) from public;
grant execute on function hard_delete_trashed_template(uuid) to lyricscloud_app;
revoke delete on resources,templates from lyricscloud_app;
grant update (song_id) on lyrics to lyricscloud_app;

comment on column resources.purge_at is 'Exact automatic purge deadline, always deleted_at plus 30 days.';
comment on column app_users.withdrawal_purge_at is 'Exact account purge deadline, always withdrawal_requested_at plus 7 days.';
comment on table lifecycle_purge_runs is 'Content-free lifecycle worker execution status and aggregate counts.';
