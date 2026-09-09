-- Recovery-only rollback. Back up first and confirm no later owner-scoped table depends on this contract.
drop table if exists user_profiles;
drop function if exists app_current_user_id();
-- lyricscloud_app is cluster-wide and intentionally retained; later databases or migrations may grant it privileges.
