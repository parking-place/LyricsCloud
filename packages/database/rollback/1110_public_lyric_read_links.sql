do $$
begin
  if exists(select 1 from lyric_public_read_links where state='active') then
    raise exception '1110 rollback blocked: active public links exist';
  end if;
end
$$;

drop function if exists app_public_lyric_access(text,uuid,uuid,bigint);
drop function if exists app_public_lyric_updates(text,uuid,uuid);
drop function if exists app_public_lyric_document(text,uuid);
drop function if exists app_public_lyric_projection(text);
drop table if exists lyric_public_link_requests;
drop table if exists lyric_public_read_links;
delete from schema_migrations where name='1110_public_lyric_read_links.sql';
