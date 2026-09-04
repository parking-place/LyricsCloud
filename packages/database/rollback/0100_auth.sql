-- Recovery-only rollback. Run manually after backing up and confirming no later migration depends on these tables.
drop table if exists auth_sessions;
drop table if exists oauth_transactions;
drop table if exists auth_identities;
drop table if exists app_users;
