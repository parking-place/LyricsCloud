do $$ begin
  if exists(select 1 from prompts where use_count<>0 or last_used_at is not null limit 1)
  then raise exception '0501_ROLLBACK_REQUIRES_EMPTY_PROMPT_USAGE'; end if;
end $$;

drop function mark_prompt_used(uuid);
alter table prompts drop constraint prompts_use_count_nonnegative;
alter table prompts drop column last_used_at;
alter table prompts drop column use_count;
delete from schema_migrations where name='0501_prompt_usage.sql';
