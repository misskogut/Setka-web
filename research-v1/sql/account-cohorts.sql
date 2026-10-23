-- Server-owned classification; accounts use the unchanged invite/claim/password APIs.
-- Enabled QA accounts behave as ordinary accounts until explicitly excluded.
CREATE TABLE public.setka_account_cohorts (
 tester_id text PRIMARY KEY REFERENCES public.prototype_v34_tester_codes(tester_id),
 cohort text NOT NULL CHECK (length(cohort) BETWEEN 1 AND 100),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 80),
 include_in_metrics boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cohort,display_name)
);
ALTER TABLE public.setka_account_cohorts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.setka_account_cohorts FROM public,anon,authenticated;
GRANT ALL ON public.setka_account_cohorts TO service_role;

CREATE VIEW public.setka_metric_accounts WITH (security_invoker=true) AS
 SELECT a.* FROM public.prototype_v40_tester_accounts a
 LEFT JOIN public.setka_account_cohorts c USING(tester_id)
 WHERE a.active AND a.password_set_at IS NOT NULL
 AND coalesce(c.include_in_metrics,true);
CREATE VIEW public.setka_metric_favorites WITH (security_invoker=true) AS
 SELECT f.* FROM public.prototype_v41_account_favorites f
 JOIN public.setka_metric_accounts a USING(tester_id);
CREATE VIEW public.setka_metric_sessions WITH (security_invoker=true) AS
 SELECT s.* FROM public.prototype_v41_account_sessions s
 JOIN public.setka_metric_accounts a USING(tester_id);
CREATE VIEW public.setka_metric_exposures WITH (security_invoker=true) AS
 SELECT e.* FROM public.prototype_v41_account_exposures e
 JOIN public.setka_metric_accounts a USING(tester_id);
CREATE VIEW public.setka_metric_public_notes WITH (security_invoker=true) AS
 SELECT n.* FROM public.prototype_v36_public_notes n
 JOIN public.setka_metric_accounts a ON a.tester_id=n.author_tester_id;
CREATE VIEW public.setka_metric_note_saves WITH (security_invoker=true) AS
 SELECT s.* FROM public.prototype_v41_note_saves s
 JOIN public.setka_metric_accounts a ON a.tester_id=s.saver_tester_id;
REVOKE ALL ON public.setka_metric_accounts,public.setka_metric_favorites,public.setka_metric_sessions,
 public.setka_metric_exposures,public.setka_metric_public_notes,public.setka_metric_note_saves FROM public,anon,authenticated;
GRANT SELECT ON public.setka_metric_accounts,public.setka_metric_favorites,public.setka_metric_sessions,
 public.setka_metric_exposures,public.setka_metric_public_notes,public.setka_metric_note_saves TO service_role;

CREATE FUNCTION public.setka_set_cohort_state(p_cohort text,p_active boolean,p_include_in_metrics boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF p_cohort IS NULL OR p_active IS NULL OR p_include_in_metrics IS NULL THEN RAISE EXCEPTION 'invalid_cohort_state'; END IF;
 -- Same lock order as the session insertion guard: account before cohort.
 PERFORM 1 FROM public.prototype_v40_tester_accounts a
 JOIN public.setka_account_cohorts c USING(tester_id)
 WHERE c.cohort=p_cohort ORDER BY a.tester_id FOR UPDATE OF a;
 PERFORM 1 FROM public.setka_account_cohorts WHERE cohort=p_cohort ORDER BY tester_id FOR UPDATE;
 UPDATE public.setka_account_cohorts SET include_in_metrics=p_include_in_metrics,updated_at=now() WHERE cohort=p_cohort;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RAISE EXCEPTION 'cohort_not_found'; END IF;
 UPDATE public.prototype_v40_tester_accounts SET active=p_active,updated_at=now()
 WHERE tester_id IN (SELECT tester_id FROM public.setka_account_cohorts WHERE cohort=p_cohort);
 UPDATE public.prototype_v34_tester_codes SET active=p_active,updated_at=now()
 WHERE tester_id IN (SELECT tester_id FROM public.setka_account_cohorts WHERE cohort=p_cohort);
 IF NOT p_active THEN
  UPDATE public.prototype_v40_tester_sessions SET revoked_at=coalesce(revoked_at,now())
  WHERE tester_id IN (SELECT tester_id FROM public.setka_account_cohorts WHERE cohort=p_cohort) AND revoked_at IS NULL;
 END IF;
 RETURN jsonb_build_object('cohort',p_cohort,'members',n,'active',p_active,'includeInMetrics',p_include_in_metrics);
END $$;
REVOKE ALL ON FUNCTION public.setka_set_cohort_state(text,boolean,boolean) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.setka_set_cohort_state(text,boolean,boolean) TO service_role;

-- Serialize token issuance against deactivation so a concurrent login cannot
-- create a fresh valid session after the group's sessions were revoked.
CREATE FUNCTION public.setka_guard_account_session() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE enabled boolean;
BEGIN
 SELECT active INTO enabled FROM public.prototype_v40_tester_accounts WHERE tester_id=NEW.tester_id FOR SHARE;
 IF enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'active_account_required'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.setka_guard_account_session() FROM public,anon,authenticated;
CREATE TRIGGER setka_active_session_guard BEFORE INSERT ON public.prototype_v40_tester_sessions
 FOR EACH ROW EXECUTE FUNCTION public.setka_guard_account_session();

CREATE OR REPLACE VIEW public.prototype_v41_config_metrics_current AS  WITH saved AS (
         SELECT setka_metric_favorites.pattern_id,
            setka_metric_favorites.config_key,
            (min((setka_metric_favorites.config)::text))::jsonb AS config,
            (count(DISTINCT setka_metric_favorites.tester_id))::integer AS save_accounts,
            (count(*))::integer AS saves,
            min(setka_metric_favorites.saved_at) AS first_saved_at,
            max(setka_metric_favorites.updated_at) AS last_saved_at
           FROM setka_metric_favorites
          GROUP BY setka_metric_favorites.pattern_id, setka_metric_favorites.config_key
        ), used AS (
         SELECT setka_metric_exposures.pattern_id,
            setka_metric_exposures.config_key,
            (count(DISTINCT setka_metric_exposures.tester_id))::integer AS use_accounts,
            (count(DISTINCT ((setka_metric_exposures.tester_id || '|'::text) || COALESCE(setka_metric_exposures.session_id, ''::text))) FILTER (WHERE (setka_metric_exposures.session_id IS NOT NULL)))::integer AS sessions,
            (count(*))::integer AS use_count,
            (COALESCE(sum(setka_metric_exposures.duration_ms), (0)::numeric))::bigint AS duration_ms
           FROM setka_metric_exposures
          WHERE (setka_metric_exposures.config_key IS NOT NULL)
          GROUP BY setka_metric_exposures.pattern_id, setka_metric_exposures.config_key
        ), activity AS (
         SELECT x.pattern_id,
            x.config_key,
            (count(DISTINCT x.tester_id))::integer AS activity_accounts
           FROM ( SELECT setka_metric_favorites.tester_id,
                    setka_metric_favorites.pattern_id,
                    setka_metric_favorites.config_key
                   FROM setka_metric_favorites
                UNION ALL
                 SELECT setka_metric_exposures.tester_id,
                    setka_metric_exposures.pattern_id,
                    setka_metric_exposures.config_key
                   FROM setka_metric_exposures
                  WHERE (setka_metric_exposures.config_key IS NOT NULL)) x
          GROUP BY x.pattern_id, x.config_key
        )
 SELECT s.pattern_id,
    s.config_key,
    s.config,
    s.save_accounts,
    s.saves,
    COALESCE(u.use_accounts, 0) AS use_accounts,
    COALESCE(a.activity_accounts, s.save_accounts) AS activity_accounts,
    COALESCE(u.sessions, 0) AS sessions,
    COALESCE(u.use_count, 0) AS use_count,
    COALESCE(u.duration_ms, (0)::bigint) AS duration_ms,
    s.first_saved_at,
    s.last_saved_at
   FROM ((saved s
     LEFT JOIN used u ON (((u.pattern_id = s.pattern_id) AND (u.config_key = s.config_key))))
     LEFT JOIN activity a ON (((a.pattern_id = s.pattern_id) AND (a.config_key = s.config_key))));

CREATE OR REPLACE VIEW public.prototype_v41_pattern_metrics_current AS  WITH pids AS (
         SELECT DISTINCT setka_metric_exposures.pattern_id
           FROM setka_metric_exposures
        UNION
         SELECT DISTINCT setka_metric_favorites.pattern_id
           FROM setka_metric_favorites
        ), exp AS (
         SELECT setka_metric_exposures.pattern_id,
            (count(*))::integer AS exposures,
            (count(DISTINCT setka_metric_exposures.tester_id))::integer AS viewing_accounts,
            (count(DISTINCT ((setka_metric_exposures.tester_id || '|'::text) || COALESCE(setka_metric_exposures.session_id, ''::text))) FILTER (WHERE (setka_metric_exposures.session_id IS NOT NULL)))::integer AS sessions,
            (COALESCE(sum(setka_metric_exposures.duration_ms), (0)::numeric))::bigint AS duration_ms
           FROM setka_metric_exposures
          GROUP BY setka_metric_exposures.pattern_id
        ), fav AS (
         SELECT setka_metric_favorites.pattern_id,
            (count(DISTINCT setka_metric_favorites.tester_id))::integer AS likes,
            (count(*))::integer AS configuration_saves,
            (count(DISTINCT setka_metric_favorites.config_key))::integer AS saved_configurations
           FROM setka_metric_favorites
          GROUP BY setka_metric_favorites.pattern_id
        )
 SELECT p.pattern_id,
    COALESCE(e.viewing_accounts, 0) AS viewing_accounts,
    COALESCE(e.sessions, 0) AS sessions,
    COALESCE(e.exposures, 0) AS exposures,
    COALESCE(f.likes, 0) AS likes,
    COALESCE(f.configuration_saves, 0) AS configuration_saves,
    COALESCE(f.saved_configurations, 0) AS saved_configurations,
    COALESCE(e.duration_ms, (0)::bigint) AS duration_ms
   FROM ((pids p
     LEFT JOIN exp e ON ((e.pattern_id = p.pattern_id)))
     LEFT JOIN fav f ON ((f.pattern_id = p.pattern_id)));

CREATE OR REPLACE VIEW public.prototype_v41_service_metrics_current AS  WITH activity AS (
         SELECT setka_metric_sessions.tester_id,
            COALESCE(setka_metric_sessions.ended_at, setka_metric_sessions.started_at) AS activity_at
           FROM setka_metric_sessions
        UNION ALL
         SELECT setka_metric_exposures.tester_id,
            COALESCE(setka_metric_exposures.ended_at, setka_metric_exposures.started_at) AS "coalesce"
           FROM setka_metric_exposures
        UNION ALL
         SELECT setka_metric_favorites.tester_id,
            setka_metric_favorites.saved_at
           FROM setka_metric_favorites
        ), patterns AS (
         SELECT DISTINCT setka_metric_exposures.pattern_id
           FROM setka_metric_exposures
        UNION
         SELECT DISTINCT setka_metric_favorites.pattern_id
           FROM setka_metric_favorites
        ), saved_configs AS (
         SELECT DISTINCT setka_metric_favorites.config_key
           FROM setka_metric_favorites
        )
 SELECT ( SELECT (count(*))::integer AS count
           FROM setka_metric_accounts
          WHERE ((setka_metric_accounts.active = true) AND (setka_metric_accounts.password_set_at IS NOT NULL))) AS connected_accounts,
    ( SELECT (count(*))::integer AS count
           FROM setka_metric_sessions) AS sessions,
    ( SELECT (count(*))::integer AS count
           FROM setka_metric_exposures) AS exposures,
    ( SELECT (count(*))::integer AS count
           FROM patterns) AS patterns,
    ( SELECT (count(*))::integer AS count
           FROM saved_configs) AS saved_configurations,
    ( SELECT (count(*))::integer AS count
           FROM setka_metric_favorites) AS configuration_saves,
    ( SELECT (count(DISTINCT activity.tester_id))::integer AS count
           FROM activity
          WHERE (activity.activity_at >= (now() - '30 days'::interval))) AS active_accounts_30d;
