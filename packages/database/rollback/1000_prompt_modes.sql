do $$
begin
  if exists(select 1 from prompts where mode='sentence' or sentence_text is not null) then
    raise exception 'PROMPT_MODE_ROLLBACK_BLOCKED';
  end if;
  if exists(select 1 from templates where type='prompt' and (prompt_mode='sentence' or prompt_text is not null)) then
    raise exception 'PROMPT_TEMPLATE_MODE_ROLLBACK_BLOCKED';
  end if;
end
$$;

alter table templates drop constraint templates_payload_matches_type;
revoke insert (prompt_mode,prompt_text) on templates from lyricscloud_app;
revoke update (prompt_mode,prompt_text) on templates from lyricscloud_app;
alter table templates drop column prompt_text, drop column prompt_mode;
alter table templates add constraint templates_payload_matches_type check (
  (type='lyrics' and lyric_body is not null and prompt_tokens is null and char_length(lyric_body) <= 100000)
  or (type='prompt' and lyric_body is null and prompt_tokens is not null and template_prompt_tokens_valid(prompt_tokens))
);

drop trigger prompts_touch_resource on prompts;
revoke insert (mode,sentence_text) on prompts from lyricscloud_app;
revoke update (mode,sentence_text) on prompts from lyricscloud_app;
drop index prompts_search_text_trgm_idx;
alter table prompts drop column search_text;
alter table prompts drop column sentence_text, drop column mode;
alter table prompts add column search_text text
  generated always as (search_normalize(plain_text)) stored;
create index prompts_search_text_trgm_idx on prompts using gin(search_text gin_trgm_ops);
create trigger prompts_touch_resource after update of plain_text on prompts
  for each row when (old.plain_text is distinct from new.plain_text)
  execute function touch_resource_after_prompt_change();

delete from schema_migrations where name='1000_prompt_modes.sql';
