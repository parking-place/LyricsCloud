-- App-first rollback is non-destructive: return to the previous app image and
-- retain the additive profile fields and owner photos for later recovery.
-- Destructive schema reversal requires a separate approved backup and write stop.
select 1;
