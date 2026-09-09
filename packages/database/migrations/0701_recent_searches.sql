create table recent_searches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  query text not null,
  search_type text not null default 'all'
    check (search_type in ('all','song','lyrics','rhyme_note','prompt')),
  normalized_query text generated always as (search_normalize(query)) stored,
  searched_at timestamptz not null default statement_timestamp(),
  constraint recent_searches_query_length check (char_length(normalized_query) between 1 and 200),
  constraint recent_searches_owner_query_type_unique unique (owner_id, normalized_query, search_type)
);

create index recent_searches_owner_time_idx
  on recent_searches(owner_id, searched_at desc, id desc);

grant select, delete on recent_searches to lyricscloud_app;
grant insert (owner_id, query, search_type) on recent_searches to lyricscloud_app;
grant update (query, searched_at) on recent_searches to lyricscloud_app;

alter table recent_searches enable row level security;
alter table recent_searches force row level security;
create policy recent_searches_owner_select on recent_searches for select to lyricscloud_app
  using (owner_id = app_current_user_id());
create policy recent_searches_owner_insert on recent_searches for insert to lyricscloud_app
  with check (owner_id = app_current_user_id());
create policy recent_searches_owner_update on recent_searches for update to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy recent_searches_owner_delete on recent_searches for delete to lyricscloud_app
  using (owner_id = app_current_user_id());

comment on table recent_searches is
  'Owner-private bounded unified-search history; never shared as recommendations or analytics.';
