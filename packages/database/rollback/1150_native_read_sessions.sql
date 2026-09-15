-- Forward-fix rollback: disable native routes first and preserve issued records for audit.
-- Destructive DROP statements are intentionally absent. Restore into a new empty database
-- only under the repository recovery runbook if the schema itself must be removed.
revoke all on native_auth_transactions from lyricscloud_app;
revoke all on native_sessions from lyricscloud_app;
