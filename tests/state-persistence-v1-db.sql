\set ON_ERROR_STOP on
-- Isolated CI database only. Does not connect to production.
create table public.prototype_v37_tester_private_archives(device_id text primary key,tester_id text not null,schema_version integer not null default 41,payload jsonb not null default '{}',favorites jsonb not null default '[]',captured_at timestamptz not null default now(),updated_at timestamptz not null default now());
grant all on public.prototype_v37_tester_private_archives to service_role;
\i research-v1/sql/state-history-upsert.sql
set role service_role;
select public.setka_private_archive_write_v1('isolated-device','isolated-A','{"symptoms":[{"id":"s","name":"Усталость","active":true,"updatedAt":"2026-10-15T13:01:00Z"}],"checkins":[{"id":"c","symptomId":"s","intensity":6,"observedAt":"2026-10-15T13:01:01Z"}]}','[]',now());
-- An older writer with no states must not erase either record.
select public.setka_private_archive_write_v1('isolated-device','isolated-A','{"symptoms":[],"checkins":[]}','[]',now());
select public.setka_private_archive_write_v1('isolated-device','isolated-A','{"symptoms":[{"id":"s","name":"Усталость","active":false,"updatedAt":"2026-10-15T13:02:00Z"}],"checkins":[]}','[]',now());
select public.setka_private_archive_write_v1('isolated-device','isolated-A','{"symptoms":[{"id":"s","name":"Усталость","active":true,"updatedAt":"2026-10-15T13:01:00Z"}],"checkins":[]}','[]',now());
reset role;
do $$declare p jsonb;begin
 select payload into p from public.prototype_v37_tester_private_archives where device_id='isolated-device';
 if jsonb_array_length(p->'symptoms')<>1 or p->'symptoms'->0->>'active'<>'false' or p->'checkins'->0->>'intensity'<>'6' then raise exception 'state_history_lost_or_duplicated';end if;
 if has_function_privilege('anon','public.setka_private_archive_write_v1(text,text,jsonb,jsonb,timestamptz)','EXECUTE') or has_function_privilege('authenticated','public.setka_private_archive_write_v1(text,text,jsonb,jsonb,timestamptz)','EXECUTE') then raise exception 'private_archive_rpc_exposed';end if;
 begin perform public.setka_private_archive_write_v1('isolated-device','isolated-B','{}','[]',now());raise exception 'cross_account_write_accepted';exception when others then if sqlerrm<>'device_identity_conflict' then raise;end if;end;
end;$$;
select 'STATE HISTORY SURVIVES STALE WRITERS, UPDATES, DUPLICATES AND CROSS-ACCOUNT ATTEMPTS' as verified;
-- Concurrent writers are launched by the workflow after this fixture completes.
