do $$ begin
  if exists(select 1 from prompts limit 1)
    or exists(select 1 from prompt_token_dictionary limit 1)
    or exists(select 1 from prompt_write_requests limit 1)
    or exists(select 1 from sync_documents where resource_type='prompt' limit 1)
  then raise exception '0500_ROLLBACK_REQUIRES_EMPTY_PROMPT_DATA'; end if;
end $$;

alter table sync_documents drop constraint sync_documents_resource_fk;
alter table sync_documents drop constraint sync_documents_resource_type_check;
alter table sync_documents add constraint sync_documents_resource_type_check
  check (resource_type in ('lyrics','rhyme_note'));
alter table sync_documents add constraint sync_documents_resource_fk
  foreign key (resource_id, owner_id, resource_type)
  references resources(id, owner_id, type) on delete cascade deferrable initially deferred;

drop function soft_delete_prompt(uuid);
drop table prompt_write_requests;
drop table prompt_tokens;
drop function validate_prompt_token_projection();
drop table prompt_token_dictionary;
drop function normalize_prompt_dictionary_write();
alter table resources drop constraint resources_prompt_subtype_fk;
drop table prompts;
drop function touch_resource_after_prompt_change();
alter table resources drop column prompt_subtype_id;
delete from schema_migrations where name='0500_prompts.sql';
