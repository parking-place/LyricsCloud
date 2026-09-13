create function revoke_lyric_capabilities_on_delete() returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
begin
  update public.lyric_read_grants
  set state = 'revoked', permission_epoch = permission_epoch + 1,
    write_enabled = false, write_epoch = write_epoch + 1,
    write_updated_at = clock_timestamp(), revoked_at = clock_timestamp()
  where resource_id = new.id and owner_id = new.owner_id and state = 'active';

  update public.lyric_public_read_links
  set state = 'revoked', permission_epoch = permission_epoch + 1,
    write_enabled = false, write_epoch = write_epoch + 1,
    revoked_at = clock_timestamp()
  where resource_id = new.id and owner_id = new.owner_id and state = 'active';

  return new;
end
$$;

revoke all on function revoke_lyric_capabilities_on_delete() from public;

create trigger resources_revoke_lyric_capabilities_on_delete
after update of deleted_at on resources
for each row
when (old.type = 'lyrics' and old.deleted_at is null and new.deleted_at is not null)
execute function revoke_lyric_capabilities_on_delete();
