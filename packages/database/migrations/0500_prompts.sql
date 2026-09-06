alter table resources add column prompt_subtype_id uuid
  generated always as (case when type = 'prompt' then id end) stored;

create table prompts (
  resource_id uuid primary key,
  owner_id uuid not null,
  resource_type text generated always as ('prompt'::text) stored,
  plain_text text not null default '',
  constraint prompts_resource_owner_type_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint prompts_resource_owner_unique unique (resource_id, owner_id),
  constraint prompts_plain_text_length check (char_length(plain_text) <= 40398)
);

alter table resources add constraint resources_prompt_subtype_fk foreign key (prompt_subtype_id)
  references prompts(resource_id) deferrable initially deferred;

create table prompt_token_dictionary (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  display_value text not null,
  normalized_value text not null,
  usage_count bigint not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint prompt_token_dictionary_owner_identity unique (id, owner_id),
  constraint prompt_token_dictionary_owner_normalized_unique unique (owner_id, normalized_value),
  constraint prompt_token_dictionary_display_length check (char_length(display_value) between 1 and 200),
  constraint prompt_token_dictionary_normalized_length check (char_length(normalized_value) between 1 and 200),
  constraint prompt_token_dictionary_usage_nonnegative check (usage_count >= 0)
);

create table prompt_tokens (
  owner_id uuid not null,
  prompt_resource_id uuid not null,
  prompt_resource_type text generated always as ('prompt'::text) stored,
  ordinal integer not null,
  dictionary_token_id uuid not null,
  display_value text not null,
  normalized_value text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, prompt_resource_id, ordinal),
  constraint prompt_tokens_prompt_fk foreign key (prompt_resource_id, owner_id, prompt_resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred,
  constraint prompt_tokens_subtype_fk foreign key (prompt_resource_id, owner_id)
    references prompts(resource_id, owner_id) on delete cascade deferrable initially deferred,
  constraint prompt_tokens_dictionary_fk foreign key (dictionary_token_id, owner_id)
    references prompt_token_dictionary(id, owner_id) on delete restrict deferrable initially deferred,
  constraint prompt_tokens_owner_normalized_unique unique (owner_id, prompt_resource_id, normalized_value),
  constraint prompt_tokens_ordinal_range check (ordinal between 0 and 199),
  constraint prompt_tokens_display_length check (char_length(display_value) between 1 and 200),
  constraint prompt_tokens_normalized_length check (char_length(normalized_value) between 1 and 200)
);

create function normalize_prompt_dictionary_write() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  new.display_value := regexp_replace(new.display_value, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  new.normalized_value := lower(regexp_replace(normalize(new.display_value, NFKC), '[[:space:]]+', ' ', 'g'));
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp(); new.updated_at := new.created_at;
  else
    new.created_at := old.created_at;
    if row(new.display_value,new.normalized_value,new.usage_count,new.last_used_at)
       is distinct from row(old.display_value,old.normalized_value,old.usage_count,old.last_used_at)
      then new.updated_at := clock_timestamp(); else new.updated_at := old.updated_at; end if;
  end if;
  return new;
end
$$;
revoke all on function normalize_prompt_dictionary_write() from public;
create trigger prompt_token_dictionary_normalize before insert or update on prompt_token_dictionary
  for each row execute function normalize_prompt_dictionary_write();

create function validate_prompt_token_projection() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare dictionary_normalized text;
begin
  new.display_value := regexp_replace(new.display_value, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  new.normalized_value := lower(regexp_replace(normalize(new.display_value, NFKC), '[[:space:]]+', ' ', 'g'));
  select normalized_value into dictionary_normalized from public.prompt_token_dictionary
    where id = new.dictionary_token_id and owner_id = new.owner_id;
  if dictionary_normalized is null or dictionary_normalized <> new.normalized_value then
    raise exception 'PROMPT_TOKEN_DICTIONARY_MISMATCH' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function validate_prompt_token_projection() from public;
create trigger prompt_tokens_validate before insert or update on prompt_tokens
  for each row execute function validate_prompt_token_projection();

create function touch_resource_after_prompt_change() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  update public.resources set updated_at = clock_timestamp()
    where id = new.resource_id and owner_id = new.owner_id and type = 'prompt';
  return new;
end
$$;
revoke all on function touch_resource_after_prompt_change() from public;
create trigger prompts_touch_resource after update of plain_text on prompts
  for each row when (old.plain_text is distinct from new.plain_text)
  execute function touch_resource_after_prompt_change();

create table prompt_write_requests (
  owner_id uuid not null references app_users(id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null,
  resource_type text generated always as ('prompt'::text) stored,
  operation text not null check (operation in ('create','duplicate','update')),
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  result_row_version bigint not null check (result_row_version > 0),
  created_at timestamptz not null default statement_timestamp(),
  primary key (owner_id, request_id),
  constraint prompt_write_requests_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred
);

create function soft_delete_prompt(target_resource_id uuid) returns boolean
language plpgsql set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.resources set deleted_at = clock_timestamp(), deletion_batch_id = gen_random_uuid()
    where id = target_resource_id and owner_id = public.app_current_user_id()
      and type = 'prompt' and deleted_at is null
      and exists(select 1 from public.prompts where resource_id=target_resource_id and owner_id=public.app_current_user_id())
    returning true into changed;
  return coalesce(changed,false);
end
$$;
revoke all on function soft_delete_prompt(uuid) from public;

alter table sync_documents drop constraint sync_documents_resource_fk;
alter table sync_documents drop constraint sync_documents_resource_type_check;
alter table sync_documents add constraint sync_documents_resource_type_check
  check (resource_type in ('lyrics','rhyme_note','prompt'));
alter table sync_documents add constraint sync_documents_resource_fk
  foreign key (resource_id, owner_id, resource_type)
  references resources(id, owner_id, type) on delete cascade deferrable initially deferred;

create index prompt_tokens_owner_prompt_order_idx on prompt_tokens(owner_id,prompt_resource_id,ordinal);
create index prompt_token_dictionary_suggest_idx on prompt_token_dictionary(owner_id,usage_count desc,last_used_at desc,id);

grant select on prompts, prompt_tokens, prompt_token_dictionary to lyricscloud_app;
grant insert (resource_id,owner_id,plain_text) on prompts to lyricscloud_app;
grant update (plain_text) on prompts to lyricscloud_app;
grant insert (owner_id,prompt_resource_id,ordinal,dictionary_token_id,display_value,normalized_value), delete on prompt_tokens to lyricscloud_app;
grant insert (id,owner_id,display_value,normalized_value,usage_count,last_used_at) on prompt_token_dictionary to lyricscloud_app;
grant update (display_value,normalized_value,usage_count,last_used_at) on prompt_token_dictionary to lyricscloud_app;
grant select,insert on prompt_write_requests to lyricscloud_app;
grant execute on function soft_delete_prompt(uuid) to lyricscloud_app;

alter table prompts enable row level security; alter table prompts force row level security;
alter table prompt_tokens enable row level security; alter table prompt_tokens force row level security;
alter table prompt_token_dictionary enable row level security; alter table prompt_token_dictionary force row level security;
alter table prompt_write_requests enable row level security; alter table prompt_write_requests force row level security;
create policy prompts_owner_all on prompts for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
create policy prompt_tokens_owner_all on prompt_tokens for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
create policy prompt_dictionary_owner_all on prompt_token_dictionary for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
create policy prompt_write_requests_owner_all on prompt_write_requests for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
