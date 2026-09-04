create table app_users (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table auth_identities (
  issuer text not null,
  subject text not null,
  user_id uuid not null references app_users(id) on delete cascade,
  email text not null,
  email_verified boolean not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now(),
  primary key (issuer, subject),
  unique (user_id, issuer)
);

create table oauth_transactions (
  state_hash text primary key,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_transactions_expiry_idx on oauth_transactions (expires_at);

create table auth_sessions (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (expires_at <= absolute_expires_at)
);

create index auth_sessions_user_idx on auth_sessions (user_id);
create index auth_sessions_expiry_idx on auth_sessions (expires_at) where revoked_at is null;
