-- Run ONLY against the empty PostgreSQL service in the platform CI job.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role;
create table public.admin_keys(id uuid primary key,active boolean not null);
create table public.setka_research_v1_pattern_catalog(pattern_id text primary key,title text,revision integer);
\ir ../research-v1/sql/pattern-defaults-v2.sql
begin;
insert into public.admin_keys values('00000000-0000-4000-8000-000000000001',true);
insert into public.setka_research_v1_pattern_catalog values('fixture-only','Original title',7);
do $$
declare out jsonb; denied boolean=false;
begin
 out=public.setka_save_pattern_defaults_v2('fixture-only',35,1,'{"patternId":"fixture-only","radius":12}',0,'00000000-0000-4000-8000-000000000001');
 if out->>'revision'<>'1' or out->>'pattern_version'<>'35' or out ? 'admin_key_id' then raise exception 'invalid_first_save'; end if;
 begin
  perform public.setka_save_pattern_defaults_v2('fixture-only',35,1,'{"patternId":"fixture-only","radius":99}',0,'00000000-0000-4000-8000-000000000001');
 exception when others then if sqlerrm<>'revision_conflict' then raise;end if;denied=true;end;
 if not denied then raise exception 'lost_update_not_rejected';end if;
 denied=false;
 begin
  perform public.setka_save_pattern_defaults_v2('fixture-only',35,1,'{"patternId":"other"}',1,'00000000-0000-4000-8000-000000000001');
 exception when others then if sqlerrm<>'invalid_configuration' then raise;end if;denied=true;end;
 if not denied then raise exception 'wrong_identity_accepted';end if;
 if (select title from public.setka_research_v1_pattern_catalog where pattern_id='fixture-only')<>'Original title' then raise exception 'name_overwritten';end if;
 if has_table_privilege('anon','public.setka_pattern_defaults_v2','SELECT') or has_table_privilege('authenticated','public.setka_pattern_defaults_v2','UPDATE') then raise exception 'public_data_access';end if;
 if has_function_privilege('anon','public.setka_save_pattern_defaults_v2(text,integer,integer,jsonb,integer,uuid)','EXECUTE') then raise exception 'public_rpc_access';end if;
end $$;
rollback;
