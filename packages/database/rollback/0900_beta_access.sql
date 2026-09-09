do $$
begin
  if exists(select 1 from beta_codes)
    or exists(select 1 from beta_signup_intents)
    or exists(select 1 from admission_grants)
    or exists(select 1 from beta_redemptions)
    or exists(select 1 from beta_signup_failure_budgets)
    or exists(select 1 from beta_code_refreshes) then
    raise exception '0900 rollback blocked: beta access state exists';
  end if;
end
$$;

drop table beta_code_refreshes;
drop table beta_signup_failure_budgets;
drop table beta_redemptions;
drop trigger app_users_revoke_admission_grants on app_users;
drop function revoke_admission_grants_for_deleted_user();
drop table admission_grants;
drop table beta_signup_intents;
drop table beta_codes;
drop table beta_code_batches;
drop table beta_code_epochs;

delete from schema_migrations where name='0900_beta_access.sql';
