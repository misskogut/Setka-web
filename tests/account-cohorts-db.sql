BEGIN;
DO $$
DECLARE tid text='T-'||upper(substr(md5(gen_random_uuid()::text),1,8)); g text='rollback-'||gen_random_uuid()::text;
 before_count integer; before_sessions integer; before_exposures integer; ck text='regression-'||gen_random_uuid()::text;
BEGIN
 SELECT configuration_saves,sessions,exposures INTO before_count,before_sessions,before_exposures FROM public.prototype_v41_service_metrics_current;
 INSERT INTO public.prototype_v34_tester_codes(tester_id,claim_hash) VALUES(tid,repeat('d',64));
 INSERT INTO public.prototype_v40_tester_accounts(tester_id,password_set_at) VALUES(tid,now());
 INSERT INTO public.setka_account_cohorts(tester_id,cohort,display_name) VALUES(tid,g,'regression');
 INSERT INTO public.prototype_v41_account_favorites(tester_id,config_key,pattern_id) VALUES(tid,ck,'qa-regression-only');
 INSERT INTO public.prototype_v41_account_sessions(tester_id,session_id,started_at) VALUES(tid,'session',now());
 INSERT INTO public.prototype_v41_account_exposures(tester_id,exposure_id,pattern_id,config_key,duration_ms) VALUES(tid,'exposure','qa-regression-only',ck,1000);
 INSERT INTO public.prototype_v40_tester_sessions(tester_id,token_hash,expires_at) VALUES(tid,repeat('e',64),now()+interval '1 hour');
 IF (SELECT configuration_saves FROM public.prototype_v41_service_metrics_current)<>before_count+1 THEN RAISE EXCEPTION 'enabled_not_counted'; END IF;
 IF (SELECT save_accounts FROM public.prototype_v41_config_metrics_current WHERE config_key=ck)<>1 THEN RAISE EXCEPTION 'wrong_hearts'; END IF;
 PERFORM public.setka_set_cohort_state(g,false,false);
 IF (SELECT configuration_saves FROM public.prototype_v41_service_metrics_current)<>before_count THEN RAISE EXCEPTION 'disabled_still_counted'; END IF;
 IF (SELECT sessions FROM public.prototype_v41_service_metrics_current)<>before_sessions THEN RAISE EXCEPTION 'session_still_counted'; END IF;
 IF (SELECT exposures FROM public.prototype_v41_service_metrics_current)<>before_exposures THEN RAISE EXCEPTION 'exposure_still_counted'; END IF;
 IF EXISTS(SELECT 1 FROM public.prototype_v41_config_metrics_current WHERE config_key=ck) THEN RAISE EXCEPTION 'excluded_card_remains'; END IF;
 IF EXISTS(SELECT 1 FROM public.prototype_v40_tester_sessions WHERE tester_id=tid AND revoked_at IS NULL) THEN RAISE EXCEPTION 'session_not_revoked'; END IF;
 BEGIN
  INSERT INTO public.prototype_v40_tester_sessions(tester_id,token_hash,expires_at) VALUES(tid,repeat('f',64),now()+interval '1 hour');
  RAISE EXCEPTION 'disabled_token_issued';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'active_account_required' THEN RAISE; END IF; END;
 IF NOT EXISTS(SELECT 1 FROM public.prototype_v41_account_favorites WHERE tester_id=tid AND config_key=ck) THEN RAISE EXCEPTION 'history_lost'; END IF;
 PERFORM public.setka_set_cohort_state(g,true,true);
 IF (SELECT configuration_saves FROM public.prototype_v41_service_metrics_current)<>before_count+1 THEN RAISE EXCEPTION 'reenable_failed'; END IF;
 IF has_table_privilege('anon','public.setka_account_cohorts','SELECT') OR has_function_privilege('anon','public.setka_set_cohort_state(text,boolean,boolean)','EXECUTE') THEN RAISE EXCEPTION 'public_can_change_group'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: enabled count, exclusion of all facts, token revocation, issuance denial, history retention, reenable, service-only ACL; fixtures rolled back' AS result;

