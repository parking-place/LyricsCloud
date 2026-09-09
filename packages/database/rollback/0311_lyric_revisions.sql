do $$ begin
  if exists(select 1 from lyric_revisions limit 1) or exists(select 1 from lyric_restore_requests limit 1)
    then raise exception '0311_ROLLBACK_REQUIRES_EMPTY_REVISIONS'; end if;
end $$;
drop table lyric_restore_requests;
drop table lyric_revisions;
alter table sync_documents drop constraint sync_documents_key_owner_unique;
alter table sync_documents drop column revision_checked_at;
alter table sync_documents drop column revision_body_sha256;
delete from schema_migrations where name='0311_lyric_revisions.sql';
