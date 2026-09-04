-- Recovery-only rollback for a disposable or restored database.
-- Back up first and confirm that no later migration depends on resources or songs.
begin;
drop table if exists songs, resources;
drop function if exists soft_delete_song(uuid);
drop function if exists touch_resource_after_song_change();
drop function if exists normalize_resource_write();
delete from schema_migrations where name = '0200_resources_songs.sql';
commit;
