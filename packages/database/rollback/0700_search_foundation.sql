drop index if exists prompt_tokens_normalized_trgm_idx;
drop index if exists tags_active_search_value_trgm_idx;
drop index if exists tags_active_normalized_trgm_idx;
drop index if exists prompts_search_text_trgm_idx;
drop index if exists rhyme_notes_search_body_trgm_idx;
drop index if exists lyrics_search_body_trgm_idx;
drop index if exists resources_active_search_title_trgm_idx;

alter table prompts drop column if exists search_text;
alter table tags drop column if exists search_value;
alter table rhyme_notes drop column if exists search_body;
alter table lyrics drop column if exists search_body;
alter table resources drop column if exists search_title;
drop function if exists search_normalize(text);
delete from schema_migrations where name='0700_search_foundation.sql';
