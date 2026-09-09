create table beta_code_epochs (
  environment text primary key check (environment in ('development','release','test')),
  epoch bigint not null default 1 check (epoch > 0),
  refreshed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table beta_code_batches (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('development','release','test')),
  epoch bigint not null check (epoch > 0),
  requested_count integer not null check (requested_count between 1 and 100),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  check (expires_at > issued_at),
  unique (id,environment,epoch)
);
create index beta_code_batches_environment_idx on beta_code_batches(environment,issued_at desc,id);

create table beta_codes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  environment text not null check (environment in ('development','release','test')),
  epoch bigint not null check (epoch > 0),
  code_digest text not null check (code_digest ~ '^[0-9a-f]{64}$'),
  digest_kid text not null check (digest_kid ~ '^[A-Za-z0-9._-]{1,64}$'),
  sealed_code bytea,
  seal_nonce bytea,
  seal_tag bytea,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  constraint beta_codes_lifecycle check (
    expires_at > issued_at
    and not (consumed_at is not null and revoked_at is not null)
    and ((sealed_code is null and seal_nonce is null and seal_tag is null)
      or (sealed_code is not null and seal_nonce is not null and seal_tag is not null))
    and (consumed_at is null and revoked_at is null
      or (sealed_code is null and seal_nonce is null and seal_tag is null))
  ),
  foreign key (batch_id,environment,epoch) references beta_code_batches(id,environment,epoch) on delete restrict,
  unique (id,environment,epoch),
  unique (id,environment)
);
create unique index beta_codes_historical_digest_unique on beta_codes(environment,code_digest);
create index beta_codes_active_idx on beta_codes(environment,epoch,expires_at,id)
  where consumed_at is null and revoked_at is null;

create table beta_signup_intents (
  intent_digest text primary key check (intent_digest ~ '^[0-9a-f]{64}$'),
  environment text not null check (environment in ('development','release','test')),
  code_id uuid not null,
  code_epoch bigint not null check (code_epoch > 0),
  email_digest text not null check (email_digest ~ '^[0-9a-f]{64}$'),
  email_kid text not null check (email_kid ~ '^[A-Za-z0-9._-]{1,64}$'),
  oauth_state_hash text not null check (oauth_state_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint beta_signup_intents_lifecycle check (
    expires_at > created_at
    and not (completed_at is not null and cancelled_at is not null)
  ),
  foreign key (code_id,environment,code_epoch) references beta_codes(id,environment,epoch) on delete restrict,
  unique (intent_digest,environment)
);
create index beta_signup_intents_pending_idx on beta_signup_intents(environment,expires_at,code_id)
  where completed_at is null and cancelled_at is null;

create table admission_grants (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('development','release','test')),
  issuer text not null,
  subject text not null,
  user_id uuid references app_users(id) on delete set null,
  source text not null check (source in ('bootstrap','beta_code')),
  state text not null default 'active' check (state in ('active','revoked')),
  granted_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null,
  constraint admission_grants_lifecycle check (
    (state='active' and user_id is not null and revoked_at is null)
      or (state='revoked' and revoked_at is not null)
  ),
  unique (environment,issuer,subject),
  unique (id,environment)
);
create index admission_grants_user_idx on admission_grants(user_id) where user_id is not null;

create function revoke_admission_grants_for_deleted_user() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  update public.admission_grants
    set state='revoked',revoked_at=coalesce(revoked_at,now()),updated_at=now()
    where user_id=old.id and state='active';
  return old;
end
$$;
revoke all on function revoke_admission_grants_for_deleted_user() from public;
create trigger app_users_revoke_admission_grants before delete on app_users
  for each row execute function revoke_admission_grants_for_deleted_user();

create table beta_redemptions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('development','release','test')),
  intent_digest text not null unique,
  code_id uuid not null unique,
  grant_id uuid not null,
  issuer text not null,
  subject text not null,
  redeemed_at timestamptz not null,
  unique (environment,issuer,subject,code_id),
  foreign key (intent_digest,environment) references beta_signup_intents(intent_digest,environment) on delete restrict,
  foreign key (code_id,environment) references beta_codes(id,environment) on delete restrict,
  foreign key (grant_id,environment) references admission_grants(id,environment) on delete restrict,
  foreign key (environment,issuer,subject) references admission_grants(environment,issuer,subject) on delete restrict
);

create table beta_signup_failure_budgets (
  environment text not null check (environment in ('development','release','test')),
  scope text not null check (scope in ('principal','global')),
  principal_digest text not null check (principal_digest ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  failure_count integer not null default 0 check (failure_count >= 0),
  updated_at timestamptz not null,
  primary key (environment,scope,principal_digest,window_started_at)
);
create index beta_signup_failure_budget_window_idx on beta_signup_failure_budgets(environment,window_started_at desc);

create table beta_code_refreshes (
  id bigint generated always as identity primary key,
  environment text not null check (environment in ('development','release','test')),
  previous_epoch bigint not null check (previous_epoch > 0),
  next_epoch bigint not null check (next_epoch = previous_epoch + 1),
  revoked_count integer not null check (revoked_count >= 0),
  cancelled_intent_count integer not null check (cancelled_intent_count >= 0),
  refreshed_at timestamptz not null
);

revoke all on beta_code_epochs,beta_code_batches,beta_codes,beta_signup_intents,
  admission_grants,beta_redemptions,beta_signup_failure_budgets,beta_code_refreshes from public;
revoke all on beta_code_epochs,beta_code_batches,beta_codes,beta_signup_intents,
  admission_grants,beta_redemptions,beta_signup_failure_budgets,beta_code_refreshes from lyricscloud_app;

comment on table beta_codes is 'Environment-scoped one-use invitation digest tombstones with temporary admin-only AEAD recovery material.';
comment on table beta_signup_intents is 'Short-lived unverified signup claims; no raw code or email is stored.';
comment on table admission_grants is 'Verified issuer and subject admission authority, separate from account lifecycle state.';
comment on table beta_redemptions is 'Immutable idempotency receipt joining one intent, code, verified principal and grant.';
