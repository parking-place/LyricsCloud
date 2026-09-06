do $$ begin
  if exists(select 1 from rhyme_notes limit 1)
    or exists(select 1 from tags limit 1)
    or exists(select 1 from resource_tags limit 1)
    or exists(select 1 from song_resource_links limit 1)
    or exists(select 1 from rhyme_note_create_requests limit 1)
    or exists(select 1 from sync_documents where resource_type = 'rhyme_note' limit 1)
  then raise exception '0400_ROLLBACK_REQUIRES_EMPTY_RHYME_DATA'; end if;
end $$;

comment on table lyric_revisions is null;
alter table sync_documents drop constraint sync_documents_resource_fk;
alter table sync_documents drop constraint sync_documents_resource_type_check;
alter table sync_documents drop column resource_type;
alter table sync_documents add column resource_type text generated always as ('lyrics'::text) stored;
alter table sync_documents add constraint sync_documents_resource_fk foreign key (resource_id, owner_id, resource_type)
  references resources(id, owner_id, type) on delete cascade deferrable initially deferred;

drop function soft_delete_rhyme_note(uuid);
drop table song_resource_links;
drop function require_active_song_resource_link();
drop table resource_tags;
drop function require_active_rhyme_tag_link();
drop table tags;
drop function normalize_tag_write();
drop table rhyme_note_create_requests;
alter table resources drop constraint resources_rhyme_note_subtype_fk;
drop table rhyme_notes;
drop function touch_resource_after_rhyme_note_change();
alter table resources drop column rhyme_note_subtype_id;
delete from schema_migrations where name = '0400_rhyme_notes.sql';
