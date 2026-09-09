-- Recovery-only rollback for a disposable or restored database.
begin;
drop table if exists song_create_requests;
delete from schema_migrations where name = '0201_song_commands.sql';
commit;
