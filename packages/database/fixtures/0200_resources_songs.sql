-- Synthetic, repeatable fixture for disposable *_test databases only.
begin;
insert into app_users(id) values
  ('02000000-0000-4000-8000-000000000001'),
  ('02000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into resources(id, owner_id, type, title, is_favorite, is_pinned, pin_order, color) values
  ('02000000-0000-4000-8000-000000000101', '02000000-0000-4000-8000-000000000001', 'song', 'FIRE', true, true, 0, 'red'),
  ('02000000-0000-4000-8000-000000000102', '02000000-0000-4000-8000-000000000001', 'song', 'NEON AFTER RAIN', false, false, null, 'blue'),
  ('02000000-0000-4000-8000-000000000201', '02000000-0000-4000-8000-000000000002', 'song', 'Synthetic B song', false, false, null, null)
on conflict (id) do nothing;

insert into songs(resource_id, owner_id, status, description, work_notes) values
  ('02000000-0000-4000-8000-000000000101', '02000000-0000-4000-8000-000000000001', 'suno_generating', '끝났다고 생각한 순간 다시 타오르는 마음.', '후렴 마지막 두 줄 교체'),
  ('02000000-0000-4000-8000-000000000102', '02000000-0000-4000-8000-000000000001', 'writing_lyrics', '비가 그친 새벽의 젖은 도시.', 'Verse 2 플로우 정리'),
  ('02000000-0000-4000-8000-000000000201', '02000000-0000-4000-8000-000000000002', 'idea', '', '')
on conflict (resource_id) do nothing;
commit;
