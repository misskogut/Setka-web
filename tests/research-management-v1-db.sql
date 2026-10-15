\set ON_ERROR_STOP on
-- This file is executed only against the isolated PostgreSQL CI service.
create role anon;create role authenticated;create role service_role bypassrls;
create table public.admin_keys(id uuid primary key,key_hash text,active boolean not null default true);
create table public.prototype_v40_tester_accounts(tester_id text primary key,password_set_at timestamptz,active boolean not null default true,last_login_at timestamptz);
create table public.prototype_v34_tester_codes(tester_id text primary key,claim_hash text unique not null,active boolean not null default true,created_at timestamptz default now(),claimed_at timestamptz,consumed_at timestamptz,claimed_device_id text,updated_at timestamptz default now());
\i research-v1/sql/pattern-catalog-invites.sql
insert into public.admin_keys(id,key_hash) values('00000000-0000-4000-8000-000000000010','isolated');
insert into public.prototype_v40_tester_accounts(tester_id,password_set_at) values('T-OWNERAAA',now()),('T-OWNERBBB',now());
do $$
declare b uuid; item jsonb; before_count integer; r jsonb;
begin
 if has_table_privilege('anon','public.setka_research_v1_pattern_catalog','SELECT') or has_table_privilege('authenticated','public.setka_research_v1_invites','SELECT') then raise exception 'private_table_exposed'; end if;
 if has_function_privilege('anon','public.setka_research_v1_issue_invites(uuid,uuid,text,integer,text,uuid,jsonb)','EXECUTE') then raise exception 'invite_rpc_exposed'; end if;
 perform public.setka_research_v1_rename_pattern('dandelion','Изолированное имя',1,'00000000-0000-4000-8000-000000000010');
 begin perform public.setka_research_v1_rename_pattern('dandelion','Ошибочное имя',1,'00000000-0000-4000-8000-000000000010');raise exception 'expected_conflict_missing';exception when others then if sqlerrm<>'revision_conflict' then raise;end if;end;
 perform public.setka_research_v1_rename_pattern('dandelion','Одуванчик',2,'00000000-0000-4000-8000-000000000010');
 if (select count(*) from public.setka_research_v1_pattern_names_history where pattern_id='dandelion')<>3 then raise exception 'name_history_lost';end if;
 select jsonb_agg(jsonb_build_object('testerId','T-AAAAAA'||chr(65+(i/26))||chr(65+(i%26)),'claimHash',md5('fixture'||i)||md5('fixture'||i))) into item from generate_series(0,99)i;
 r=public.setka_research_v1_issue_invites(null,'00000000-0000-4000-8000-000000000011','Изолированный пакет',101,'T-OWNERAAA',null,item);b=(r->>'batchId')::uuid;
 if (r->>'issued')::integer<>100 then raise exception 'wrong_chunk_count';end if;
 begin perform public.setka_research_v1_issue_invites(b,'00000000-0000-4000-8000-000000000012','Чужой',101,'T-OWNERBBB',null,item);raise exception 'ownership_not_checked';exception when others then if sqlerrm<>'batch_not_owned' then raise;end if;end;
 begin perform public.setka_research_v1_issue_invites(b,'00000000-0000-4000-8000-000000000011','Повтор',101,'T-OWNERAAA',null,item);raise exception 'request_replayed';exception when others then if sqlerrm<>'request_already_issued' then raise;end if;end;
 r=public.setka_research_v1_issue_invites(b,'00000000-0000-4000-8000-000000000013','Изолированный пакет',101,'T-OWNERAAA',null,'[{"testerId":"T-ZZZZZZZZ","claimHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]');
 if (select count(*) from public.prototype_v34_tester_codes where batch_id=b)<>101 then raise exception 'wrong_total';end if;
 update public.prototype_v34_tester_codes set consumed_at=now(),claimed_at=now() where tester_id='T-ZZZZZZZZ';
 insert into public.prototype_v40_tester_accounts(tester_id,password_set_at)values('T-ZZZZZZZZ',now());
 if not exists(select 1 from public.setka_research_v1_invites where tester_id='T-ZZZZZZZZ' and issued_by_tester_id='T-OWNERAAA' and password_set_at is not null) then raise exception 'referral_link_lost';end if;
 raise notice 'REAL POSTGRES TRANSACTIONS, REVISION CONFLICT, ROLLBACK HISTORY, BATCHES, OWNER AND REFERRAL LINKS PASS';
end $$;
