-- Applied to gfchgaphzhxufwdhrcis as migration 20261105191507.
-- Cosmetic-only UI icon overrides; no change to audio sources or user data.
create table if not exists public.setka_music_ui_icons_v1 (
  slot text primary key check (slot in (
    'nav-note','orbit-tab','listener','motion-static','motion-cw',
    'motion-ccw','motion-counter','motion-eight','motion-chaos',
    'motion-spiral','motion-breath','speed-slow','speed-fast','power'
  )),
  icon_path text not null check (icon_path ~ '^icons/[a-f0-9-]{36}\\.(png|webp)$'),
  updated_at timestamptz not null default now()
);
alter table public.setka_music_ui_icons_v1 enable row level security;
revoke all on public.setka_music_ui_icons_v1 from anon, authenticated;
comment on table public.setka_music_ui_icons_v1 is
 'Admin-key-managed cosmetic UI icon overrides for SETKA Music. No user data. Public read only via dedicated Edge Function.';
