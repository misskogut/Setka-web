-- Additive SETKA mobile/research contract. No existing history is removed.
create table public.setka_research_v1_pattern_catalog (
 pattern_id text primary key, title text not null check(length(btrim(title)) between 1 and 80 and title !~ '[[:cntrl:]]'),
 revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.setka_research_v1_pattern_names_history (
 pattern_id text not null references public.setka_research_v1_pattern_catalog(pattern_id), revision integer not null,
 title text not null, admin_key_id uuid references public.admin_keys(id), created_at timestamptz not null default now(),
 primary key(pattern_id,revision)
);
insert into public.setka_research_v1_pattern_catalog(pattern_id,title) values
 ('tentacle-orbit','Tentacle Orbit'),('dandelion','Одуванчик'),('fish-wave','Носовая волна'),
 ('breathing-fractal','Breathing Fractal'),('breathing-fractal-growth','Breathing Fractal · Growth'),
 ('rgb-glitch-rings','RGB Glitch Rings'),('stereo-dna','Stereo DNA');
insert into public.setka_research_v1_pattern_names_history(pattern_id,revision,title)
 select pattern_id,revision,title from public.setka_research_v1_pattern_catalog;

create table public.setka_research_v1_invite_batches (
 id uuid primary key default gen_random_uuid(), label text not null check(length(btrim(label)) between 1 and 120),
 issued_by_tester_id text references public.prototype_v40_tester_accounts(tester_id),
 admin_key_id uuid references public.admin_keys(id), requested_count integer not null check(requested_count>0),
 created_at timestamptz not null default now(),
 check((issued_by_tester_id is not null)::integer+(admin_key_id is not null)::integer=1)
);
alter table public.prototype_v34_tester_codes
 add column batch_id uuid references public.setka_research_v1_invite_batches(id),
 add column issued_by_tester_id text references public.prototype_v40_tester_accounts(tester_id),
 add column invite_label text;
create index setka_mobile_invite_batch_idx on public.prototype_v34_tester_codes(batch_id) where batch_id is not null;
create index setka_mobile_invite_issuer_idx on public.prototype_v34_tester_codes(issued_by_tester_id) where issued_by_tester_id is not null;
create table public.setka_research_v1_invite_requests (
 request_id uuid primary key, batch_id uuid not null references public.setka_research_v1_invite_batches(id),
 created_at timestamptz not null default now()
);
create index setka_mobile_invite_request_batch_idx on public.setka_research_v1_invite_requests(batch_id);

-- These tables and RPCs are accessible only inside already-authenticated Edge functions.
alter table public.setka_research_v1_pattern_catalog enable row level security;
alter table public.setka_research_v1_pattern_names_history enable row level security;
alter table public.setka_research_v1_invite_batches enable row level security;
alter table public.setka_research_v1_invite_requests enable row level security;
revoke all on public.setka_research_v1_pattern_catalog, public.setka_research_v1_pattern_names_history,
 public.setka_research_v1_invite_batches, public.setka_research_v1_invite_requests from public, anon, authenticated;
grant all on public.setka_research_v1_pattern_catalog, public.setka_research_v1_pattern_names_history,
 public.setka_research_v1_invite_batches, public.setka_research_v1_invite_requests to service_role;

create function public.setka_research_v1_rename_pattern(p_pattern_id text,p_title text,p_expected_revision integer,p_admin_key_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.setka_research_v1_pattern_catalog;
begin
 if not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then raise exception 'admin_required'; end if;
 select * into r from public.setka_research_v1_pattern_catalog where pattern_id=p_pattern_id for update;
 if not found then raise exception 'pattern_not_found'; end if;
 if r.revision<>p_expected_revision then raise exception 'revision_conflict'; end if;
 if r.title=btrim(p_title) then return to_jsonb(r); end if;
 update public.setka_research_v1_pattern_catalog set title=btrim(p_title),revision=revision+1,updated_at=now()
 where pattern_id=p_pattern_id returning * into r;
 insert into public.setka_research_v1_pattern_names_history(pattern_id,revision,title,admin_key_id)
 values(r.pattern_id,r.revision,r.title,p_admin_key_id);
 return to_jsonb(r);
end $$;

create function public.setka_research_v1_issue_invites(p_batch_id uuid,p_request_id uuid,p_label text,p_requested_count integer,
 p_issuer_tester_id text,p_admin_key_id uuid,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b public.setka_research_v1_invite_batches; n integer; issued integer;
begin
 if (p_issuer_tester_id is not null)::integer+(p_admin_key_id is not null)::integer<>1 then raise exception 'issuer_required'; end if;
 if p_issuer_tester_id is not null and not exists(select 1 from public.prototype_v40_tester_accounts where tester_id=p_issuer_tester_id and active and password_set_at is not null) then raise exception 'active_account_required'; end if;
 if p_admin_key_id is not null and not exists(select 1 from public.admin_keys where id=p_admin_key_id and active) then raise exception 'admin_required'; end if;
 n=jsonb_array_length(p_items);
 if n<1 or n>100 or p_requested_count<1 or p_requested_count<n or p_request_id is null then raise exception 'invalid_count'; end if;
 if p_batch_id is null then
  insert into public.setka_research_v1_invite_batches(label,issued_by_tester_id,admin_key_id,requested_count)
  values(btrim(p_label),p_issuer_tester_id,p_admin_key_id,p_requested_count) returning * into b;
 else
  select * into b from public.setka_research_v1_invite_batches where id=p_batch_id for update;
  if not found or b.issued_by_tester_id is distinct from p_issuer_tester_id or b.admin_key_id is distinct from p_admin_key_id then raise exception 'batch_not_owned'; end if;
 end if;
 if exists(select 1 from public.setka_research_v1_invite_requests where request_id=p_request_id) then raise exception 'request_already_issued'; end if;
 select count(*) into issued from public.prototype_v34_tester_codes where batch_id=b.id;
 if issued+n>b.requested_count then raise exception 'batch_complete'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'testerId') !~ '^T-[A-Z2-9]{8}$' or (x->>'claimHash') !~ '^[0-9a-f]{64}$' or x->>'testerId' is null or x->>'claimHash' is null) then raise exception 'invalid_items'; end if;
 insert into public.setka_research_v1_invite_requests(request_id,batch_id) values(p_request_id,b.id);
 insert into public.prototype_v34_tester_codes(tester_id,claim_hash,active,consumed_at,batch_id,issued_by_tester_id,invite_label)
 select x->>'testerId',x->>'claimHash',true,null,b.id,b.issued_by_tester_id,b.label from jsonb_array_elements(p_items) x;
 return jsonb_build_object('batchId',b.id,'label',b.label,'issued',issued+n,'requested',b.requested_count);
end $$;
revoke all on function public.setka_research_v1_rename_pattern(text,text,integer,uuid) from public,anon,authenticated;
revoke all on function public.setka_research_v1_issue_invites(uuid,uuid,text,integer,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.setka_research_v1_rename_pattern(text,text,integer,uuid) to service_role;
grant execute on function public.setka_research_v1_issue_invites(uuid,uuid,text,integer,text,uuid,jsonb) to service_role;

-- No hashes, device IDs or login secrets enter this view.
create view public.setka_research_v1_invites with(security_invoker=true) as
 select c.tester_id,c.batch_id,c.issued_by_tester_id,c.invite_label,c.active,c.created_at,c.claimed_at,c.consumed_at,
 a.password_set_at,a.last_login_at,a.active as account_active,b.requested_count,b.admin_key_id
 from public.prototype_v34_tester_codes c left join public.prototype_v40_tester_accounts a using(tester_id)
 left join public.setka_research_v1_invite_batches b on b.id=c.batch_id;
revoke all on public.setka_research_v1_invites from public,anon,authenticated;
grant select on public.setka_research_v1_invites to service_role;
