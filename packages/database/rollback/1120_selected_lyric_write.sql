do $$
begin
  if exists(select 1 from lyric_read_grants where write_enabled) then
    raise exception '1120 rollback blocked: active selected writers exist';
  end if;
  if exists(select 1 from sync_updates where access_mode='write') then
    raise exception '1120 rollback blocked: selected writer updates exist';
  end if;
end
$$;

drop function if exists app_authorize_selected_lyric_write(uuid,uuid,bigint,bigint);
drop function if exists app_selected_lyric_write_receipt(uuid,uuid,uuid,bigint,bigint);
drop table if exists lyric_share_access_requests;
alter table sync_documents drop column if exists last_access_mode, drop column if exists last_actor_id;
alter table sync_update_receipts
  drop column if exists write_epoch,
  drop column if exists permission_epoch,
  drop column if exists grant_id,
  drop column if exists access_mode,
  drop column if exists actor_id,
  drop column if exists accepted_sequence;
alter table sync_updates
  drop column if exists write_epoch,
  drop column if exists permission_epoch,
  drop column if exists grant_id,
  drop column if exists access_mode,
  drop column if exists actor_id;
alter table lyric_read_grants
  drop column if exists write_updated_at,
  drop column if exists write_epoch,
  drop column if exists write_enabled;
delete from schema_migrations where name='1120_selected_lyric_write.sql';
