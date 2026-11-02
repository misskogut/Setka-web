\set ON_ERROR_STOP on
-- Existing platform CI has already created the base catalog and roles.
\ir ../research-v1/sql/pattern-publication.sql
begin;
insert into public.admin_keys values('00000000-0000-4000-8000-000000000019',true);
insert into public.setka_research_v1_pattern_catalog values('future-publication-fixture','Future',1);
insert into public.setka_pattern_publication(pattern_id) values('future-publication-fixture');
do $$
declare r jsonb; first_rev bigint; next_rev bigint;
begin
 select revision into first_rev from public.setka_pattern_publication where pattern_id='future-publication-fixture';
 if (select state from public.setka_pattern_publication where pattern_id='future-publication-fixture')<>'testing' then raise exception 'new_pattern_leaked';end if;
 r=public.setka_set_pattern_publication('future-publication-fixture','published',first_rev,'00000000-0000-4000-8000-000000000019');
 next_rev=(r->>'revision')::bigint;
 if r->>'state'<>'published' or r ? 'admin_key_id' or next_rev<=first_rev then raise exception 'bad_publish';end if;
 begin perform public.setka_set_pattern_publication('future-publication-fixture','disabled',first_rev,'00000000-0000-4000-8000-000000000019');raise exception 'stale_update_accepted';exception when others then if sqlerrm<>'revision_conflict' then raise;end if;end;
 begin perform public.setka_set_pattern_publication('future-publication-fixture','disabled',next_rev,'00000000-0000-4000-8000-000000000099');raise exception 'bad_admin_accepted';exception when others then if sqlerrm<>'admin_required' then raise;end if;end;
 r=public.setka_set_pattern_publication('future-publication-fixture','disabled',next_rev,'00000000-0000-4000-8000-000000000019');
 if (select count(*) from public.setka_pattern_publication_history where pattern_id='future-publication-fixture')<>2 then raise exception 'audit_missing';end if;
 if has_table_privilege('anon','public.setka_pattern_publication','SELECT') or has_function_privilege('authenticated','public.setka_set_pattern_publication(text,text,bigint,uuid)','EXECUTE') then raise exception 'public_access';end if;
 if (select title from public.setka_research_v1_pattern_catalog where pattern_id='future-publication-fixture')<>'Future' then raise exception 'history_changed';end if;
end $$;
rollback;
