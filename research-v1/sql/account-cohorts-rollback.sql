-- Restore pre-cohort metric definitions; does not delete any account/history.
CREATE OR REPLACE VIEW public.prototype_v41_config_metrics_current AS  WITH saved AS (
         SELECT prototype_v41_account_favorites.pattern_id,
            prototype_v41_account_favorites.config_key,
            (min((prototype_v41_account_favorites.config)::text))::jsonb AS config,
            (count(DISTINCT prototype_v41_account_favorites.tester_id))::integer AS save_accounts,
            (count(*))::integer AS saves,
            min(prototype_v41_account_favorites.saved_at) AS first_saved_at,
            max(prototype_v41_account_favorites.updated_at) AS last_saved_at
           FROM prototype_v41_account_favorites
          GROUP BY prototype_v41_account_favorites.pattern_id, prototype_v41_account_favorites.config_key
        ), used AS (
         SELECT prototype_v41_account_exposures.pattern_id,
            prototype_v41_account_exposures.config_key,
            (count(DISTINCT prototype_v41_account_exposures.tester_id))::integer AS use_accounts,
            (count(DISTINCT ((prototype_v41_account_exposures.tester_id || '|'::text) || COALESCE(prototype_v41_account_exposures.session_id, ''::text))) FILTER (WHERE (prototype_v41_account_exposures.session_id IS NOT NULL)))::integer AS sessions,
            (count(*))::integer AS use_count,
            (COALESCE(sum(prototype_v41_account_exposures.duration_ms), (0)::numeric))::bigint AS duration_ms
           FROM prototype_v41_account_exposures
          WHERE (prototype_v41_account_exposures.config_key IS NOT NULL)
          GROUP BY prototype_v41_account_exposures.pattern_id, prototype_v41_account_exposures.config_key
        ), activity AS (
         SELECT x.pattern_id,
            x.config_key,
            (count(DISTINCT x.tester_id))::integer AS activity_accounts
           FROM ( SELECT prototype_v41_account_favorites.tester_id,
                    prototype_v41_account_favorites.pattern_id,
                    prototype_v41_account_favorites.config_key
                   FROM prototype_v41_account_favorites
                UNION ALL
                 SELECT prototype_v41_account_exposures.tester_id,
                    prototype_v41_account_exposures.pattern_id,
                    prototype_v41_account_exposures.config_key
                   FROM prototype_v41_account_exposures
                  WHERE (prototype_v41_account_exposures.config_key IS NOT NULL)) x
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
         SELECT DISTINCT prototype_v41_account_exposures.pattern_id
           FROM prototype_v41_account_exposures
        UNION
         SELECT DISTINCT prototype_v41_account_favorites.pattern_id
           FROM prototype_v41_account_favorites
        ), exp AS (
         SELECT prototype_v41_account_exposures.pattern_id,
            (count(*))::integer AS exposures,
            (count(DISTINCT prototype_v41_account_exposures.tester_id))::integer AS viewing_accounts,
            (count(DISTINCT ((prototype_v41_account_exposures.tester_id || '|'::text) || COALESCE(prototype_v41_account_exposures.session_id, ''::text))) FILTER (WHERE (prototype_v41_account_exposures.session_id IS NOT NULL)))::integer AS sessions,
            (COALESCE(sum(prototype_v41_account_exposures.duration_ms), (0)::numeric))::bigint AS duration_ms
           FROM prototype_v41_account_exposures
          GROUP BY prototype_v41_account_exposures.pattern_id
        ), fav AS (
         SELECT prototype_v41_account_favorites.pattern_id,
            (count(DISTINCT prototype_v41_account_favorites.tester_id))::integer AS likes,
            (count(*))::integer AS configuration_saves,
            (count(DISTINCT prototype_v41_account_favorites.config_key))::integer AS saved_configurations
           FROM prototype_v41_account_favorites
          GROUP BY prototype_v41_account_favorites.pattern_id
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
         SELECT prototype_v41_account_sessions.tester_id,
            COALESCE(prototype_v41_account_sessions.ended_at, prototype_v41_account_sessions.started_at) AS activity_at
           FROM prototype_v41_account_sessions
        UNION ALL
         SELECT prototype_v41_account_exposures.tester_id,
            COALESCE(prototype_v41_account_exposures.ended_at, prototype_v41_account_exposures.started_at) AS "coalesce"
           FROM prototype_v41_account_exposures
        UNION ALL
         SELECT prototype_v41_account_favorites.tester_id,
            prototype_v41_account_favorites.saved_at
           FROM prototype_v41_account_favorites
        ), patterns AS (
         SELECT DISTINCT prototype_v41_account_exposures.pattern_id
           FROM prototype_v41_account_exposures
        UNION
         SELECT DISTINCT prototype_v41_account_favorites.pattern_id
           FROM prototype_v41_account_favorites
        ), saved_configs AS (
         SELECT DISTINCT prototype_v41_account_favorites.config_key
           FROM prototype_v41_account_favorites
        )
 SELECT ( SELECT (count(*))::integer AS count
           FROM prototype_v40_tester_accounts
          WHERE ((prototype_v40_tester_accounts.active = true) AND (prototype_v40_tester_accounts.password_set_at IS NOT NULL))) AS connected_accounts,
    ( SELECT (count(*))::integer AS count
           FROM prototype_v41_account_sessions) AS sessions,
    ( SELECT (count(*))::integer AS count
           FROM prototype_v41_account_exposures) AS exposures,
    ( SELECT (count(*))::integer AS count
           FROM patterns) AS patterns,
    ( SELECT (count(*))::integer AS count
           FROM saved_configs) AS saved_configurations,
    ( SELECT (count(*))::integer AS count
           FROM prototype_v41_account_favorites) AS configuration_saves,
    ( SELECT (count(DISTINCT activity.tester_id))::integer AS count
           FROM activity
          WHERE (activity.activity_at >= (now() - '30 days'::interval))) AS active_accounts_30d;
