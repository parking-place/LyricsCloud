drop trigger if exists resources_revoke_lyric_capabilities_on_delete on resources;
drop function if exists revoke_lyric_capabilities_on_delete();

-- Revoked grants and links remain revoked. Re-enabling old capabilities during
-- rollback would cross the deletion security boundary.
delete from schema_migrations where name = '1140_sharing_stability.sql';
