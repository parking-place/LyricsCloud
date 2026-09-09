alter table beta_signup_intents add column claimed_code_digest text;
update beta_signup_intents i
set claimed_code_digest=c.code_digest
from beta_codes c
where c.id=i.code_id and c.environment=i.environment;
alter table beta_signup_intents alter column claimed_code_digest set not null;
alter table beta_signup_intents add constraint beta_signup_intents_claimed_code_digest_check
  check (claimed_code_digest ~ '^[0-9a-f]{64}$');
alter table beta_signup_intents alter column code_id drop not null;
alter table beta_signup_intents alter column code_epoch drop not null;
alter table beta_signup_intents add constraint beta_signup_intents_resolution check (
  (code_id is null)=(code_epoch is null)
  and (completed_at is null or code_id is not null)
);
create index beta_signup_intents_claimed_code_idx
  on beta_signup_intents(environment,claimed_code_digest,expires_at)
  where completed_at is null and cancelled_at is null;

comment on column beta_signup_intents.claimed_code_digest is
  'Environment-bound claim retained before OAuth without revealing whether a code exists.';
