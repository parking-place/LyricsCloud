revoke update (song_id) on lyrics from lyricscloud_app;
drop function if exists hard_delete_trashed_template(uuid);
drop function if exists hard_delete_trashed_resource(uuid);

drop table if exists lifecycle_purge_runs;

drop index if exists app_users_withdrawal_purge_idx;
alter table app_users drop constraint if exists app_users_withdrawal_state;
alter table app_users drop constraint if exists app_users_status_check;
update app_users set status='blocked' where status='withdrawal_pending';
alter table app_users drop column if exists withdrawal_purge_at;
alter table app_users drop column if exists withdrawal_requested_at;
alter table app_users add constraint app_users_status_check check (status in ('active','blocked'));

drop trigger if exists templates_set_purge_deadline on templates;
drop function if exists set_template_purge_deadline();
drop index if exists templates_due_purge_idx;
drop index if exists templates_owner_trash_idx;
alter table templates drop constraint if exists templates_purge_deadline;
alter table templates drop column if exists purge_at;

drop trigger if exists resources_set_purge_deadline on resources;
drop function if exists set_resource_purge_deadline();
drop index if exists resources_due_purge_idx;
drop index if exists resources_owner_trash_idx;
alter table resources drop constraint if exists resources_purge_deadline;
alter table resources drop column if exists purge_at;

delete from schema_migrations where name='0802_lifecycle.sql';
