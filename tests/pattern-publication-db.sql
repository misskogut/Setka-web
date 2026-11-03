\set ON_ERROR_STOP on
-- Existing platform CI has already created the base catalog and roles.
\ir ../research-v1/sql/pattern-publication.sql
begin;
insert into public.admin_keys values('00000000-0000-4000-8000-000000000019',true);
insert into public.setka_research_v1_pattern_catalog values('future-publication-fixture','Future',1);
insert into public.setka_pattern_publication(pattern_id) values('future-publication-fixture');
insert into public.prototype_v34_tester_codes(tester_id,claim_hash) values('T-PUBTEST',repeat('9',64));
insert into public.prototype_v40_tester_accounts(tester_id,password_set_at) values('T-PUBTEST',now());
insert into public.prototype_v41_account_favorites(tester_id,config_key,pattern_id) values('T-PUBTEST','original-publication-config','future-publication-fixture');
do $$
declare r jsonb; first_rev bigint; next_rev bigint;
begin
 select revision into first_rev from public.setka_pattern_publication where pattern_id='future-publication-fixture';
 if (select state from public.setka_pattern_publication where pattern_id='future-publication-fixture')<>'testing' then raise exception 'new_pattern_leaked';end if;
 r=public.setka_set_pattern_publication('future-publication-fixture','published',first_rev,'00000000-0000-4000-8000-000000000019');
 next_rev=(r->>'revision')::bigint;
 if public.setka_published_catalog_metrics(array['future-publication-fixture'])->>'configuration_saves'<>'1' then raise exception 'published_save_not_counted';end if;
 if r->>'state'<>'published' or r ? 'admin_key_id' or next_rev<=first_rev then raise exception 'bad_publish';end if;
 begin perform public.setka_set_pattern_publication('future-publication-fixture','disabled',first_rev,'00000000-0000-4000-8000-000000000019');raise exception 'stale_update_accepted';exception when others then if sqlerrm<>'revision_conflict' then raise;end if;end;
 begin perform public.setka_set_pattern_publication('future-publication-fixture','disabled',next_rev,'00000000-0000-4000-8000-000000000099');raise exception 'bad_admin_accepted';exception when others then if sqlerrm<>'admin_required' then raise;end if;end;
 r=public.setka_set_pattern_publication('future-publication-fixture','disabled',next_rev,'00000000-0000-4000-8000-000000000019');
 if public.setka_published_catalog_metrics(array['future-publication-fixture'])->>'patterns'<>'0' then raise exception 'hidden_in_public_totals';end if;
 if (select count(*) from public.setka_pattern_publication_history where pattern_id='future-publication-fixture')<>2 then raise exception 'audit_missing';end if;
 if has_table_privilege('anon','public.setka_pattern_publication','SELECT') or has_function_privilege('authenticated','public.setka_set_pattern_publication(text,text,bigint,uuid)','EXECUTE') then raise exception 'public_access';end if;
 if not exists(select 1 from public.prototype_v41_account_favorites where config_key='original-publication-config') then raise exception 'favorite_lost';end if;
 if (select title from public.setka_research_v1_pattern_catalog where pattern_id='future-publication-fixture')<>'Future' then raise exception 'history_changed';end if;
end $$;
rollback;

-- Separate editorial order transaction, preserving publication and user data.
\ir ../research-v1/sql/pattern-order.sql
begin;
insert into public.admin_keys values('00000000-0000-4000-8000-000000000021',true);
insert into public.setka_research_v1_pattern_catalog values('future-order-fixture','Future order',1);
do $$
declare r jsonb;
begin
 r=public.setka_set_pattern_order(array['future-order-fixture'],0,'00000000-0000-4000-8000-000000000021');
 if r->>'revision'<>'1' or r ? 'admin_key_id' or r->'pattern_ids'->>0<>'future-order-fixture' then raise exception 'order_not_saved';end if;
 begin perform public.setka_set_pattern_order(array[]::text[],0,'00000000-0000-4000-8000-000000000021');raise exception 'stale_order_accepted';exception when others then if sqlerrm<>'revision_conflict' then raise;end if;end;
 begin perform public.setka_set_pattern_order(array[]::text[],1,'00000000-0000-4000-8000-000000000099');raise exception 'unauthorized_order';exception when others then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.setka_set_pattern_order(array['future-order-fixture','future-order-fixture'],1,'00000000-0000-4000-8000-000000000021');raise exception 'duplicate_order_accepted';exception when others then if sqlerrm<>'invalid_pattern_order' then raise;end if;end;
 begin perform public.setka_set_pattern_order(array['missing-order-fixture'],1,'00000000-0000-4000-8000-000000000021');raise exception 'unknown_order_accepted';exception when others then if sqlerrm<>'invalid_pattern_order' then raise;end if;end;
 if has_table_privilege('anon','public.setka_pattern_order','SELECT') or has_table_privilege('authenticated','public.setka_pattern_order','UPDATE') or has_function_privilege('authenticated','public.setka_set_pattern_order(text[],bigint,uuid)','EXECUTE') then raise exception 'public_order_access';end if;
 if (select count(*) from public.setka_pattern_order_history)<>1 then raise exception 'order_history_missing';end if;
 if exists(select 1 from public.setka_pattern_publication where pattern_id='future-order-fixture') then raise exception 'ordering_published_pattern';end if;
end $$;
rollback;
