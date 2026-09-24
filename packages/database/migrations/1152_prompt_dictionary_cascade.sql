-- RESTRICT is checked before sibling account cascades, even when marked
-- DEFERRABLE. A pg_dump restore can recreate the foreign keys in an order
-- that makes account deletion fail while prompt tokens still exist.
-- NO ACTION keeps dictionary references protected at transaction commit while
-- letting the account's token and dictionary cascades finish together.
alter table public.prompt_tokens drop constraint prompt_tokens_dictionary_fk;
alter table public.prompt_tokens add constraint prompt_tokens_dictionary_fk
  foreign key (dictionary_token_id, owner_id)
  references public.prompt_token_dictionary(id, owner_id)
  on delete no action deferrable initially deferred;
