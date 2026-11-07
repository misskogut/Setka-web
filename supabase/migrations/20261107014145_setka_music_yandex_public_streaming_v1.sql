-- SETKA: owner-approved external original WAV/MP3 from the Yandex Disk collection.
-- This migration was applied to Supabase as 20261107014145.
-- Do not store media in the 20-MB bucket or transcode the large source files.
alter table public.setka_music_tracks_v1
 add column if not exists external_source_path text,
 add column if not exists external_source_hash text,
 add column if not exists external_source_bytes bigint,
 add column if not exists external_audio_url text,
 add column if not exists external_audio_url_expires timestamptz;
create unique index if not exists setka_music_tracks_external_source_path_unique
 on public.setka_music_tracks_v1(external_source_path)
 where external_source_path is not null;
create table if not exists public.setka_music_external_refresh_v1 (
 id integer primary key check (id=1),
 attempted_at timestamptz not null default '2000-01-01 00:00:00+00'
);
insert into public.setka_music_external_refresh_v1(id) values(1) on conflict(id) do nothing;
alter table public.setka_music_external_refresh_v1 enable row level security;
revoke all on public.setka_music_external_refresh_v1 from public, anon, authenticated;
grant select, update on public.setka_music_external_refresh_v1 to service_role;
comment on column public.setka_music_tracks_v1.external_source_path is
 'Owner-supplied Yandex Disk source path; link refreshed server-side, original audio bytes streamed with no conversion.';
