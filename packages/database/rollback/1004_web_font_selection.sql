update lyric_display_settings set writing_font='sans' where writing_font='noto_sans_kr';
update user_settings set writing_font='sans' where writing_font='noto_sans_kr';

alter table user_settings
  drop constraint if exists user_settings_writing_font_check;
alter table user_settings
  add constraint user_settings_writing_font_check
  check (writing_font in ('sans','serif','mono'));

alter table lyric_display_settings
  drop constraint if exists lyric_display_settings_writing_font_check;
alter table lyric_display_settings
  add constraint lyric_display_settings_writing_font_check
  check (writing_font in ('sans','serif','mono'));

delete from schema_migrations where name='1004_web_font_selection.sql';
