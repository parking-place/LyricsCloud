create table native_auth_transactions (
  transaction_hash text primary key,
  state_hash text not null,
  pkce_challenge text not null,
  redirect_uri_hash text not null,
  expires_at timestamptz not null,
  authorized_user_id uuid references app_users(id) on delete cascade,
  code_hash text unique,
  code_expires_at timestamptz,
  authorized_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (pkce_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  check ((authorized_user_id is null and code_hash is null and code_expires_at is null and authorized_at is null)
    or (authorized_user_id is not null and code_hash is not null and code_expires_at is not null and authorized_at is not null)),
  check (code_expires_at is null or code_expires_at <= expires_at)
);

create index native_auth_transactions_expiry_idx on native_auth_transactions (expires_at);

create table native_sessions (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  scope text not null default 'read' check (scope = 'read'),
  expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (expires_at <= absolute_expires_at)
);

create index native_sessions_user_idx on native_sessions (user_id);
create index native_sessions_expiry_idx on native_sessions (expires_at) where revoked_at is null;

revoke all on native_auth_transactions from lyricscloud_app;
revoke all on native_sessions from lyricscloud_app;
