create table sync_documents (
  document_key uuid primary key default gen_random_uuid(),
  resource_id uuid not null unique,
  owner_id uuid not null,
  resource_type text generated always as ('lyrics'::text) stored,
  snapshot bytea not null,
  snapshot_sequence bigint not null default 0,
  projected_at timestamptz,
  projection_error_code text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint sync_documents_resource_fk foreign key (resource_id, owner_id, resource_type)
    references resources(id, owner_id, type) on delete cascade deferrable initially deferred
);

create table sync_updates (
  sequence bigint generated always as identity,
  document_key uuid not null references sync_documents(document_key) on delete cascade,
  update_id uuid not null,
  payload bytea not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (document_key, sequence),
  unique (document_key, update_id),
  constraint sync_update_size check (octet_length(payload) between 1 and 1048576)
);

create table sync_update_receipts (
  document_key uuid not null references sync_documents(document_key) on delete cascade,
  update_id uuid not null,
  payload_sha256 text not null,
  received_at timestamptz not null default statement_timestamp(),
  primary key (document_key, update_id)
);

create index sync_documents_owner_resource_idx on sync_documents(owner_id, resource_id);
create index sync_updates_document_sequence_idx on sync_updates(document_key, sequence);

grant select, insert on sync_documents to lyricscloud_app;
grant update (snapshot, snapshot_sequence, projected_at, projection_error_code, updated_at) on sync_documents to lyricscloud_app;
grant select, insert, delete on sync_updates to lyricscloud_app;
grant usage, select on sequence sync_updates_sequence_seq to lyricscloud_app;
grant select, insert on sync_update_receipts to lyricscloud_app;

alter table sync_documents enable row level security;
alter table sync_documents force row level security;
alter table sync_updates enable row level security;
alter table sync_updates force row level security;
alter table sync_update_receipts enable row level security;
alter table sync_update_receipts force row level security;
create policy sync_documents_owner_all on sync_documents for all to lyricscloud_app
  using (owner_id = app_current_user_id()) with check (owner_id = app_current_user_id());
create policy sync_updates_owner_all on sync_updates for all to lyricscloud_app
  using (exists (select 1 from sync_documents d where d.document_key = sync_updates.document_key and d.owner_id = app_current_user_id()))
  with check (exists (select 1 from sync_documents d where d.document_key = sync_updates.document_key and d.owner_id = app_current_user_id()));
create policy sync_receipts_owner_all on sync_update_receipts for all to lyricscloud_app
  using (exists (select 1 from sync_documents d where d.document_key = sync_update_receipts.document_key and d.owner_id = app_current_user_id()))
  with check (exists (select 1 from sync_documents d where d.document_key = sync_update_receipts.document_key and d.owner_id = app_current_user_id()));
