drop policy if exists sync_updates_selected_lyric_read on sync_updates;
drop policy if exists sync_documents_selected_lyric_read on sync_documents;
drop policy if exists lyrics_selected_read on lyrics;
drop policy if exists resources_selected_lyric_read on resources;

drop function if exists app_has_lyric_read_access(uuid);
drop function if exists app_sharing_identity(uuid);
drop function if exists app_resolve_active_sharing_id(uuid);

drop table if exists lyric_share_requests;
drop table if exists lyric_read_grants;

alter table user_profiles drop constraint if exists user_profiles_sharing_id_unique;
alter table user_profiles drop column if exists sharing_id;

delete from schema_migrations where name='1100_selected_lyric_sharing.sql';
