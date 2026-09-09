-- Empty/disposable database ONLY. For populated databases preserve the schema,
-- roll forward with a corrective migration or restore a verified full backup to
-- a separate database and validate before switching. Never discard user lyrics.
begin;
do $$
begin
  if exists (select 1 from lyrics) or exists (select 1 from resources where type = 'lyrics' or deletion_batch_id is not null)
    then raise exception '0300_ROLLBACK_REQUIRES_EMPTY_LYRICS_AND_BATCHES'; end if;
end
$$;
create or replace function soft_delete_song(target_resource_id uuid) returns boolean
language plpgsql set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.resources r set deleted_at = statement_timestamp()
    where r.id = target_resource_id and r.owner_id = public.app_current_user_id()
      and r.type = 'song' and r.deleted_at is null
      and exists (select 1 from public.songs s where s.resource_id = r.id and s.owner_id = r.owner_id)
    returning true into changed;
  return coalesce(changed, false);
end
$$;
alter table resources drop constraint resources_lyrics_subtype_fk;
drop table lyric_create_requests, lyrics;
drop function require_active_lyric_song();
drop function touch_resource_after_lyric_change();
alter table songs drop constraint songs_resource_owner_identity;
alter table resources drop column lyrics_subtype_id, drop column deletion_batch_id;
delete from schema_migrations where name = '0300_lyrics.sql';
commit;
