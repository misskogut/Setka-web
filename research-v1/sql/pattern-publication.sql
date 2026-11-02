-- Publication is an editorial state, independent of renderer/data versions.
create sequence public.setka_pattern_publication_revision;
create table public.setka_pattern_publication (
 pattern_id text primary key references public.setka_research_v1_pattern_catalog(pattern_id),
 state text not null default 'testing' check(state in ('testing','published','disabled')),
 revision bigint not null,
 updated_at timestamptz not null default now(),
 admin_key_id uuid references public.admin_keys(id)
);
create table public.setka_pattern_publication_history (
 revision bigint primary key,
 pattern_id text not null,
 previous_state text,
 state text not null,
 changed_at timestamptz not null default now(),
 admin_key_id uuid references public.admin_keys(id)
);
alter table public.setka_pattern_publication enable row level security;
alter table public.setka_pattern_publication_history enable row level security;
revoke all on public.setka_pattern_publication,public.setka_pattern_publication_history from public,anon,authenticated;
revoke all on sequence public.setka_pattern_publication_revision from public,anon,authenticated;
grant all on public.setka_pattern_publication,public.setka_pattern_publication_history to service_role;
grant usage,select on sequence public.setka_pattern_publication_revision to service_role;
-- Serialize publication receipts, including discovery inserts, so a response
-- captured before a committed update cannot carry that update's revision.
create function public.setka_publication_revision_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(746523881);
 new.revision=nextval('public.setka_pattern_publication_revision');
 return new;
end $$;
revoke all on function public.setka_publication_revision_guard() from public,anon,authenticated;
grant execute on function public.setka_publication_revision_guard() to service_role;
create trigger setka_publication_revision before insert or update on public.setka_pattern_publication
for each row execute function public.setka_publication_revision_guard();
-- One-time compatibility seed: existing catalog stays published. Future IDs
-- are inserted by discovery with the table's TESTING default, never this seed.
insert into public.setka_pattern_publication(pattern_id,state)
select pattern_id,'published' from public.setka_research_v1_pattern_catalog;
create function public.setka_set_pattern_publication(p_pattern_id text,p_state text,p_expected_revision bigint,p_admin_key_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.setka_pattern_publication; old_state text;
begin
 perform pg_catalog.pg_advisory_xact_lock(746523881);
 if not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then raise exception 'admin_required';end if;
 if p_state is null or p_state not in ('testing','published','disabled') or p_expected_revision is null or p_expected_revision<0 then raise exception 'invalid_publication';end if;
 perform 1 from public.setka_research_v1_pattern_catalog where pattern_id=p_pattern_id for update;
 if not found then raise exception 'unknown_pattern';end if;
 insert into public.setka_pattern_publication(pattern_id) values(p_pattern_id) on conflict do nothing;
 select * into r from public.setka_pattern_publication where pattern_id=p_pattern_id for update;
 if r.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if r.state=p_state then return to_jsonb(r)-'admin_key_id';end if;
 old_state=r.state;
 update public.setka_pattern_publication set state=p_state,updated_at=now(),admin_key_id=p_admin_key_id
 where pattern_id=p_pattern_id returning * into r;
 insert into public.setka_pattern_publication_history(revision,pattern_id,previous_state,state,admin_key_id)
 values(r.revision,r.pattern_id,old_state,r.state,p_admin_key_id);
 return to_jsonb(r)-'admin_key_id';
end $$;
revoke all on function public.setka_set_pattern_publication(text,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.setka_set_pattern_publication(text,text,bigint,uuid) to service_role;

-- Public totals are computed from the same eligible-account facts and the
-- published installed IDs; hiding a pattern never rewrites research facts.
create function public.setka_published_catalog_metrics(p_pattern_ids text[])
returns jsonb language sql stable security invoker set search_path='' as $$
 with allowed as (
  select pattern_id from public.setka_pattern_publication
  where state='published' and pattern_id=any(p_pattern_ids)
 ), e as (select e.* from public.setka_metric_exposures e join allowed a using(pattern_id)),
 f as (select f.* from public.setka_metric_favorites f join allowed a using(pattern_id))
 select jsonb_build_object(
  'sessions',(select count(distinct (tester_id,session_id)) from e where session_id is not null),
  'exposures',(select count(*) from e),
  'patterns',(select count(*) from (select pattern_id from e union select pattern_id from f) x),
  'saved_configurations',(select count(distinct (pattern_id,config_key)) from f),
  'configuration_saves',(select count(*) from f)
 );
$$;
revoke all on function public.setka_published_catalog_metrics(text[]) from public,anon,authenticated;
grant execute on function public.setka_published_catalog_metrics(text[]) to service_role;
