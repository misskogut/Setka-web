-- SETKA integrity audit. Read-only; NULL session_id is legitimate free usage.
-- Run against the setka-web-research Supabase project.
select 'account_exposure_missing_session' as relation,count(*)::bigint as broken
from public.prototype_v41_account_exposures e
where e.session_id is not null and not exists (
 select 1 from public.prototype_v41_account_sessions s
 where s.session_id=e.session_id and s.tester_id=e.tester_id
)
union all
select 'account_exposure_missing_tester',count(*) from public.prototype_v41_account_exposures e
where not exists(select 1 from public.prototype_v40_tester_accounts a where a.tester_id=e.tester_id)
union all
select 'account_session_missing_tester',count(*) from public.prototype_v41_account_sessions s
where not exists(select 1 from public.prototype_v40_tester_accounts a where a.tester_id=s.tester_id)
union all
select 'account_favorite_missing_tester',count(*) from public.prototype_v41_account_favorites f
where not exists(select 1 from public.prototype_v40_tester_accounts a where a.tester_id=f.tester_id)
union all
select 'service_exposure_missing_session',count(*) from public.prototype_v40_service_exposures e
where e.session_id is not null and not exists(select 1 from public.prototype_v40_service_sessions s where s.session_id=e.session_id)
union all
select 'music_listen_missing_track',count(*) from public.setka_music_listen_events_v1 e
where e.track_id is not null and not exists(select 1 from public.setka_music_tracks_v1 t where t.id=e.track_id)
union all
select 'legacy_favorite_missing_device',count(*) from public.prototype_v35_favorites f
where not exists(select 1 from public.prototype_v34_devices d where d.device_id=f.device_id)
union all
select 'raw_event_missing_session',count(*) from public.prototype_v34_raw_events e
where e.session_id is not null and not exists(select 1 from public.prototype_v34_sessions s where s.session_id=e.session_id);
