alter table prompts
  add column mode text not null default 'tags',
  add column sentence_text text,
  add constraint prompts_mode_check check (mode in ('tags','sentence')),
  add constraint prompts_sentence_text_length check (sentence_text is null or char_length(sentence_text) <= 40398),
  add constraint prompts_active_payload_check check (mode <> 'sentence' or sentence_text is not null);

drop index prompts_search_text_trgm_idx;
alter table prompts drop column search_text;
alter table prompts add column search_text text
  generated always as (search_normalize(plain_text || ' ' || coalesce(sentence_text,''))) stored;
create index prompts_search_text_trgm_idx on prompts using gin(search_text gin_trgm_ops);

drop trigger prompts_touch_resource on prompts;
create trigger prompts_touch_resource after update of plain_text,sentence_text,mode on prompts
  for each row when (row(old.plain_text,old.sentence_text,old.mode)
    is distinct from row(new.plain_text,new.sentence_text,new.mode))
  execute function touch_resource_after_prompt_change();

alter table templates drop constraint templates_payload_matches_type;
alter table templates
  add column prompt_mode text not null default 'tags',
  add column prompt_text text,
  add constraint templates_prompt_mode_check check (prompt_mode in ('tags','sentence')),
  add constraint templates_prompt_text_length check (prompt_text is null or char_length(prompt_text) <= 40398),
  add constraint templates_payload_matches_type check (
    (type='lyrics' and lyric_body is not null and prompt_tokens is null and prompt_text is null and char_length(lyric_body) <= 100000)
    or (type='prompt' and lyric_body is null and prompt_tokens is not null
      and template_prompt_tokens_valid(prompt_tokens)
      and (prompt_mode='tags' or (prompt_mode='sentence' and prompt_text is not null)))
  );

grant insert (mode,sentence_text) on prompts to lyricscloud_app;
grant update (mode,sentence_text) on prompts to lyricscloud_app;
grant insert (prompt_mode,prompt_text) on templates to lyricscloud_app;
grant update (prompt_mode,prompt_text) on templates to lyricscloud_app;

comment on column prompts.mode is 'Active prompt representation. Inactive tag and sentence representations remain losslessly stored.';
comment on column prompts.sentence_text is 'Unnormalized sentence-mode source; NULL means no sentence representation has been created.';
comment on column prompts.search_text is 'Generated search projection of both prompt representations. Never render as authored text.';
comment on column templates.prompt_mode is 'Prompt template representation; lyrics rows retain the harmless tags default.';
comment on column templates.prompt_text is 'Unnormalized sentence prompt template source.';
