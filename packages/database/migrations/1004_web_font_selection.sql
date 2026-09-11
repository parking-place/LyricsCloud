alter table user_settings
  drop constraint if exists user_settings_writing_font_check;

alter table user_settings
  add constraint user_settings_writing_font_check
  check (writing_font in ('sans','serif','mono','noto_sans_kr'));

alter table lyric_display_settings
  drop constraint if exists lyric_display_settings_writing_font_check;

alter table lyric_display_settings
  add constraint lyric_display_settings_writing_font_check
  check (writing_font in ('sans','serif','mono','noto_sans_kr'));
