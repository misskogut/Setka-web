-- SETKA Music: owner-managed soft removal of optional sound glyphs.
-- No existing music tracks, icons, paths or asset files are deleted.
create table if not exists public.setka_music_hidden_icons_v1 (
  icon_key text primary key check (icon_key ~ '^[a-z0-9_-]{1,40}$'),
  hidden_at timestamptz not null default now()
);
alter table public.setka_music_hidden_icons_v1 enable row level security;
revoke all on public.setka_music_hidden_icons_v1 from public, anon, authenticated;
grant select, insert, update, delete on public.setka_music_hidden_icons_v1 to service_role;
comment on table public.setka_music_hidden_icons_v1 is 'Owner-managed hidden builtin music icon keys; existing track links and SVG assets remain intact.';
