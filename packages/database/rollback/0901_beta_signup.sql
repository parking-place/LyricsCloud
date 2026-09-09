do $$
begin
  if exists(select 1 from beta_signup_intents where code_id is null or code_epoch is null) then
    raise exception '0901 rollback blocked: unresolved signup intents exist';
  end if;
end
$$;

drop index beta_signup_intents_claimed_code_idx;
alter table beta_signup_intents drop constraint beta_signup_intents_resolution;
alter table beta_signup_intents alter column code_epoch set not null;
alter table beta_signup_intents alter column code_id set not null;
alter table beta_signup_intents drop constraint beta_signup_intents_claimed_code_digest_check;
alter table beta_signup_intents drop column claimed_code_digest;
delete from schema_migrations where name='0901_beta_signup.sql';
