-- Existing applied migration: 20261105173327_setka_music_catalog_v1_20261105
-- SETKA Music v1. Additive and idempotent; other SETKA objects are untouched.
create table if not exists public.setka_music_categories_v1 (
 id text primary key check (id ~ '^[a-z0-9_-]{2,40}$'),
 title text not null check (char_length(title) between 1 and 100),
 icon_path text,
 sort_order integer not null default 0,
 visible boolean not null default true,
 is_system boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists public.setka_music_tracks_v1 (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 120),
 audio_path text not null unique check (audio_path ~ '^audio/[a-z0-9-]+\.(mp3|m4a|wav|ogg)$'),
 icon_key text not null default 'music' check (icon_key ~ '^[a-z0-9_-]{1,40}$'),
 icon_path text,
 category_ids text[] not null default '{}'::text[],
 sort_order integer not null default 0,
 published boolean not null default false,
 loop boolean not null default true,
 duration_seconds numeric(10,2),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision integer not null default 1
);
create index if not exists setka_music_tracks_v1_public_sort
 on public.setka_music_tracks_v1 (sort_order,created_at) where published;
alter table public.setka_music_categories_v1 enable row level security;
alter table public.setka_music_tracks_v1 enable row level security;
revoke all on public.setka_music_categories_v1 from anon,authenticated;
revoke all on public.setka_music_tracks_v1 from anon,authenticated;
insert into public.setka_music_categories_v1(id,title,sort_order,visible,is_system)
values ('hand','Тактильное',0,true,true),
 ('eye','Открытый глаз',1,true,true),
 ('sleep','Закрытый глаз',2,true,true),
 ('8d','8D',3,true,true)
on conflict (id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('setka-music','setka-music',true,20971520,
 array['audio/mpeg','audio/mp4','audio/wav','audio/ogg','image/png','image/svg+xml','image/webp'])
on conflict (id) do nothing;
-- No anon/authenticated upload policy: authorized writes happen only through
-- the dedicated Edge Function, which validates the existing admin key.
