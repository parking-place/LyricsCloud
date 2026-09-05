do $$ begin
  if exists(select 1 from sync_documents limit 1) then raise exception '0310_ROLLBACK_REQUIRES_EMPTY_SYNC_DOCUMENTS'; end if;
end $$;
drop table sync_update_receipts;
drop table sync_updates;
drop table sync_documents;
delete from schema_migrations where name = '0310_crdt_sync.sql';
