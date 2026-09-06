alter table prompts
  add column use_count bigint not null default 0,
  add column last_used_at timestamptz,
  add constraint prompts_use_count_nonnegative check (use_count >= 0);

create function mark_prompt_used(target_resource_id uuid) returns table(use_count bigint,last_used_at timestamptz)
language plpgsql set search_path = pg_catalog, public as $$
begin
  return query update public.prompts p
    set use_count=p.use_count+1,last_used_at=clock_timestamp()
    from public.resources r
    where p.resource_id=target_resource_id and p.owner_id=public.app_current_user_id()
      and r.id=p.resource_id and r.owner_id=p.owner_id and r.type='prompt' and r.deleted_at is null
    returning p.use_count,p.last_used_at;
end
$$;
revoke all on function mark_prompt_used(uuid) from public;
grant execute on function mark_prompt_used(uuid) to lyricscloud_app;

create index prompts_owner_last_used_idx on prompts(owner_id,last_used_at desc,resource_id)
  where last_used_at is not null;

grant update (use_count,last_used_at) on prompts to lyricscloud_app;
