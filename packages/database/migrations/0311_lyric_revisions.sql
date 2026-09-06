alter table sync_documents add column revision_checked_at timestamptz not null default statement_timestamp();
alter table sync_documents add column revision_body_sha256 text not null default '';
update sync_documents d set revision_body_sha256=encode(sha256(convert_to(l.body,'UTF8')),'hex')
  from lyrics l where l.resource_id=d.resource_id and l.owner_id=d.owner_id;
alter table sync_documents add constraint sync_documents_key_owner_unique unique(document_key,owner_id);
grant update (revision_checked_at,revision_body_sha256) on sync_documents to lyricscloud_app;
create index sync_documents_revision_checked_idx on sync_documents(revision_checked_at);

create table lyric_revisions (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique,
  document_key uuid not null,
  owner_id uuid not null,
  body text not null check(char_length(body)<=100000),
  body_sha256 text not null check(body_sha256 ~ '^[0-9a-f]{64}$'),
  reason text not null check(reason in ('interval','leave','duplicate','large_paste','before_restore')),
  created_at timestamptz not null default statement_timestamp(),
  foreign key(document_key,owner_id) references sync_documents(document_key,owner_id) on delete cascade
);
create index lyric_revisions_document_recent_idx on lyric_revisions(document_key,created_at desc,sequence desc);
create index lyric_revisions_expiry_idx on lyric_revisions(created_at);

-- Receipts outlive retention so an uncertain restore is never applied twice.
-- No lyric body or snapshot is stored in receipts.
create table lyric_restore_requests (
  document_key uuid not null,
  owner_id uuid not null,
  request_id uuid not null,
  request_sha256 text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key(document_key,request_id),
  foreign key(document_key,owner_id) references sync_documents(document_key,owner_id) on delete cascade
);

grant select,insert,delete on lyric_revisions to lyricscloud_app;
grant usage,select on sequence lyric_revisions_sequence_seq to lyricscloud_app;
grant select,insert on lyric_restore_requests to lyricscloud_app;
alter table lyric_revisions enable row level security;
alter table lyric_revisions force row level security;
alter table lyric_restore_requests enable row level security;
alter table lyric_restore_requests force row level security;
create policy lyric_revisions_owner_all on lyric_revisions for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
create policy lyric_restore_requests_owner_all on lyric_restore_requests for all to lyricscloud_app
  using(owner_id=app_current_user_id()) with check(owner_id=app_current_user_id());
