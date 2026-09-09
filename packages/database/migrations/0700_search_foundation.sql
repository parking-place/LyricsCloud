create extension if not exists pg_trgm;

create function search_normalize(input text) returns text
language sql immutable strict parallel safe
set search_path = pg_catalog
as $$
  select btrim(lower(regexp_replace(normalize(input, NFKC), '[[:space:]]+', ' ', 'g')))
$$;
revoke all on function search_normalize(text) from public;
grant execute on function search_normalize(text) to lyricscloud_app;

alter table resources add column search_title text
  generated always as (search_normalize(title)) stored;
alter table lyrics add column search_body text
  generated always as (search_normalize(body)) stored;
alter table rhyme_notes add column search_body text
  generated always as (search_normalize(body)) stored;
alter table prompts add column search_text text
  generated always as (search_normalize(plain_text)) stored;
alter table tags add column search_value text
  generated always as (search_normalize(display_value)) stored;

create index resources_active_search_title_trgm_idx
  on resources using gin(search_title gin_trgm_ops)
  where deleted_at is null and type in ('song','lyrics','rhyme_note','prompt');
create index lyrics_search_body_trgm_idx on lyrics using gin(search_body gin_trgm_ops);
create index rhyme_notes_search_body_trgm_idx on rhyme_notes using gin(search_body gin_trgm_ops);
create index prompts_search_text_trgm_idx on prompts using gin(search_text gin_trgm_ops);
create index tags_active_search_value_trgm_idx
  on tags using gin(search_value gin_trgm_ops) where deleted_at is null;
create index prompt_tokens_normalized_trgm_idx
  on prompt_tokens using gin(normalized_value gin_trgm_ops);

comment on function search_normalize(text) is
  'NFKC, lowercase and collapsed whitespace projection for private literal substring search; authored text remains unchanged.';
comment on column resources.search_title is 'Generated search projection. Never render as authored text.';
comment on column lyrics.search_body is 'Generated search projection. Never render as authored text.';
comment on column rhyme_notes.search_body is 'Generated search projection. Never render as authored text.';
comment on column prompts.search_text is 'Generated search projection of prompt tokens. Never render as authored text.';
comment on column tags.search_value is 'Generated search projection. Tag identity remains normalized_value.';
