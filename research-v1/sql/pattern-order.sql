-- Editorial display order is separate from immutable algorithm release dates.
create table public.setka_pattern_order (
 singleton boolean primary key default true check(singleton),
 pattern_ids text[] not null default '{}',
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now(),
 admin_key_id uuid references public.admin_keys(id)
);
insert into public.setka_pattern_order(singleton) values(true);
create table public.setka_pattern_order_history (
 revision bigint primary key,
 previous_ids text[] not null,
 pattern_ids text[] not null,
 changed_at timestamptz not null default now(),
 admin_key_id uuid references public.admin_keys(id)
);
alter table public.setka_pattern_order enable row level security;
alter table public.setka_pattern_order_history enable row level security;
revoke all on public.setka_pattern_order,public.setka_pattern_order_history from public,anon,authenticated;
grant all on public.setka_pattern_order,public.setka_pattern_order_history to service_role;
create function public.setka_set_pattern_order(p_pattern_ids text[],p_expected_revision bigint,p_admin_key_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.setka_pattern_order; old_ids text[];
begin
 if not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then raise exception 'admin_required';end if;
 if p_pattern_ids is null or cardinality(p_pattern_ids)>500 or p_expected_revision is null or p_expected_revision<0
   or exists(select 1 from unnest(p_pattern_ids) x where x is null or x !~ '^[a-z][a-z0-9-]{2,79}$')
   or (select count(distinct x) from unnest(p_pattern_ids) x)<>cardinality(p_pattern_ids)
   or exists(select 1 from unnest(p_pattern_ids) x where not exists(select 1 from public.setka_research_v1_pattern_catalog c where c.pattern_id=x))
 then raise exception 'invalid_pattern_order';end if;
 select * into strict r from public.setka_pattern_order where singleton for update;
 if r.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
 if r.pattern_ids=p_pattern_ids then return to_jsonb(r)-'admin_key_id'-'singleton';end if;
 old_ids=r.pattern_ids;
 update public.setka_pattern_order set pattern_ids=p_pattern_ids,revision=revision+1,updated_at=now(),admin_key_id=p_admin_key_id
 where singleton returning * into r;
 insert into public.setka_pattern_order_history(revision,previous_ids,pattern_ids,admin_key_id)
 values(r.revision,old_ids,r.pattern_ids,p_admin_key_id);
 return to_jsonb(r)-'admin_key_id'-'singleton';
end $$;
revoke all on function public.setka_set_pattern_order(text[],bigint,uuid) from public,anon,authenticated;
grant execute on function public.setka_set_pattern_order(text[],bigint,uuid) to service_role;
