-- 1.4.1: preserve registered state history under stale/concurrent archive writers.
-- Existing ownership checks and table grants are unchanged. Service-only RPCs.
create or replace function public.setka_private_state_merge_v1(p_old jsonb,p_new jsonb)
returns jsonb language sql immutable parallel safe set search_path='' as $$
 with records as (
  select value as v,0 as incoming from jsonb_array_elements(case when jsonb_typeof(p_old)='array' then p_old else '[]'::jsonb end)
  union all
  select value,1 from jsonb_array_elements(case when jsonb_typeof(p_new)='array' then p_new else '[]'::jsonb end)
 ), keyed as (
  select v,incoming,coalesce(nullif(v->>'id',''),'legacy-'||md5(v::text)) as k,
   coalesce(nullif(v->>'updatedAt',''),nullif(v->>'observedAt',''),nullif(v->>'createdAt',''),'') as version
  from records where jsonb_typeof(v)='object'
 ), latest as (select distinct on(k) k,v from keyed order by k,version desc,incoming desc)
 select coalesce(jsonb_agg(v order by coalesce(v->>'createdAt',v->>'observedAt',''),k),'[]'::jsonb) from latest;
$$;
create or replace function public.setka_private_archive_write_v1(p_device_id text,p_tester_id text,p_payload jsonb,p_favorites jsonb,p_captured_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.prototype_v37_tester_private_archives;
begin
 if coalesce(p_device_id,'')='' or coalesce(p_tester_id,'')='' or jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_favorites) is distinct from 'array' then raise exception 'invalid_archive';end if;
 insert into public.prototype_v37_tester_private_archives as old(device_id,tester_id,schema_version,payload,favorites,captured_at,updated_at)
 values(p_device_id,p_tester_id,41,p_payload,p_favorites,p_captured_at,clock_timestamp())
 on conflict(device_id) do update set
  schema_version=excluded.schema_version,
  payload=jsonb_set(jsonb_set(excluded.payload,'{symptoms}',public.setka_private_state_merge_v1(old.payload->'symptoms',excluded.payload->'symptoms')),'{checkins}',public.setka_private_state_merge_v1(old.payload->'checkins',excluded.payload->'checkins')),
  favorites=excluded.favorites,captured_at=excluded.captured_at,updated_at=clock_timestamp()
 where old.tester_id=excluded.tester_id
 returning * into r;
 if not found then raise exception 'device_identity_conflict';end if;
 return jsonb_build_object('updatedAt',r.updated_at,'stateHistory',jsonb_build_object('symptoms',coalesce(r.payload->'symptoms','[]'::jsonb),'checkins',coalesce(r.payload->'checkins','[]'::jsonb)));
end;
$$;
revoke all on function public.setka_private_state_merge_v1(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.setka_private_archive_write_v1(text,text,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.setka_private_state_merge_v1(jsonb,jsonb) to service_role;
grant execute on function public.setka_private_archive_write_v1(text,text,jsonb,jsonb,timestamptz) to service_role;
