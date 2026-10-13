-- New, isolated research planning registry. No participant assignments or frontend changes.
create table public.setka_research_v1_experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(title) between 3 and 160),
  hypothesis text not null check(length(hypothesis) between 10 and 4000),
  pattern_id text not null,
  target_metric text not null check(target_metric in ('view_duration','completion','state_delta')),
  minimum_participants integer not null check(minimum_participants between 2 and 100000),
  group_a jsonb not null default '{}', group_b jsonb not null default '{}',
  status text not null default 'draft' check(status in ('draft','prepared','paused','closed')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.setka_research_v1_experiment_revisions (
  experiment_id uuid not null references public.setka_research_v1_experiments(id),
  revision integer not null,
  content jsonb not null,
  decision text not null,
  admin_key_id uuid not null references public.admin_keys(id),
  created_at timestamptz not null default now(),
  primary key(experiment_id,revision)
);
alter table public.setka_research_v1_experiments enable row level security;
alter table public.setka_research_v1_experiment_revisions enable row level security;
revoke all on public.setka_research_v1_experiments,public.setka_research_v1_experiment_revisions from public,anon,authenticated;
grant select,insert,update on public.setka_research_v1_experiments to service_role;
grant select,insert on public.setka_research_v1_experiment_revisions to service_role;
create function public.setka_research_v1_save_experiment(
  p_id uuid,p_expected_revision integer,p_title text,p_hypothesis text,p_pattern_id text,
  p_target_metric text,p_minimum_participants integer,p_group_a jsonb,p_group_b jsonb,
  p_status text,p_decision text,p_admin_key_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.setka_research_v1_experiments;
begin
  if not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then
    raise exception 'admin_access_revoked';
  end if;
  if p_id is null then
    if p_status<>'draft' or p_expected_revision<>0 then raise exception 'new_plan_must_be_draft';end if;
    insert into public.setka_research_v1_experiments(title,hypothesis,pattern_id,target_metric,minimum_participants,group_a,group_b)
    values(p_title,p_hypothesis,p_pattern_id,p_target_metric,p_minimum_participants,p_group_a,p_group_b) returning * into item;
  else
    select * into item from public.setka_research_v1_experiments where id=p_id for update;
    if item.id is null then raise exception 'experiment_not_found';end if;
    if item.revision<>p_expected_revision then raise exception 'revision_conflict';end if;
    update public.setka_research_v1_experiments set title=p_title,hypothesis=p_hypothesis,pattern_id=p_pattern_id,
      target_metric=p_target_metric,minimum_participants=p_minimum_participants,group_a=p_group_a,group_b=p_group_b,
      status=p_status,revision=revision+1,updated_at=now() where id=p_id returning * into item;
  end if;
  insert into public.setka_research_v1_experiment_revisions(experiment_id,revision,content,decision,admin_key_id)
    values(item.id,item.revision,to_jsonb(item),p_decision,p_admin_key_id);
  return to_jsonb(item);
end $$;
revoke execute on function public.setka_research_v1_save_experiment(uuid,integer,text,text,text,text,integer,jsonb,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.setka_research_v1_save_experiment(uuid,integer,text,text,text,text,integer,jsonb,jsonb,text,text,uuid) to service_role;
-- Rollback: disable the new endpoint/UI. Keep saved plans and append-only revisions.
-- Do not drop tables containing user-authored research plans.
