-- Additive settings overrides only. No personal history is changed or copied.
create table public.setka_pattern_defaults_v2 (
 pattern_id text primary key references public.setka_research_v1_pattern_catalog(pattern_id),
 pattern_version integer not null check(pattern_version>0),
 schema_version integer not null check(schema_version>0),
 config jsonb not null check(jsonb_typeof(config)='object'),
 revision integer not null check(revision>0),
 updated_at timestamptz not null default now(),
 admin_key_id uuid not null references public.admin_keys(id)
);
alter table public.setka_pattern_defaults_v2 enable row level security;
revoke all on public.setka_pattern_defaults_v2 from public,anon,authenticated;
grant all on public.setka_pattern_defaults_v2 to service_role;
create function public.setka_save_pattern_defaults_v2(p_pattern_id text,p_pattern_version integer,p_schema_version integer,
 p_config jsonb,p_expected_revision integer,p_admin_key_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.setka_pattern_defaults_v2;
begin
 if not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then raise exception 'admin_required'; end if;
 if p_expected_revision<0 or p_pattern_version<1 or p_schema_version<1 or jsonb_typeof(p_config)<>'object'
   or p_config->>'patternId' is distinct from p_pattern_id then raise exception 'invalid_configuration'; end if;
 -- Lock the catalog row even for the first override, avoiding two first writes.
 perform 1 from public.setka_research_v1_pattern_catalog where pattern_id=p_pattern_id for update;
 if not found then raise exception 'unknown_pattern'; end if;
 select * into r from public.setka_pattern_defaults_v2 where pattern_id=p_pattern_id;
 if coalesce(r.revision,0)<>p_expected_revision then raise exception 'revision_conflict'; end if;
 insert into public.setka_pattern_defaults_v2(pattern_id,pattern_version,schema_version,config,revision,admin_key_id)
 values(p_pattern_id,p_pattern_version,p_schema_version,p_config,p_expected_revision+1,p_admin_key_id)
 on conflict(pattern_id) do update set pattern_version=excluded.pattern_version,schema_version=excluded.schema_version,
 config=excluded.config,revision=excluded.revision,admin_key_id=excluded.admin_key_id,updated_at=now()
 returning * into r;
 return to_jsonb(r)-'admin_key_id';
end $$;
revoke all on function public.setka_save_pattern_defaults_v2(text,integer,integer,jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.setka_save_pattern_defaults_v2(text,integer,integer,jsonb,integer,uuid) to service_role;
