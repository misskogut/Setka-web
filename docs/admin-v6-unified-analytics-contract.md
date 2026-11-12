# SETKA unified analytics and recommendations — V6 implementation contract

Status: design contract; NOT a claim that ingestion, authentication or recommendations have been migrated.

## Principles
- A stable anonymous installation ID and a verified account ID are distinct identifiers. Registration creates a verified link; historical events retain their original actor_type and timestamps.
- The same event schema and calculation rules apply to both guest and account actors.
- Event IDs are immutable UUIDs and idempotency keys. Event time and server receipt time are separate.
- Aggregate across devices by verified account identity only. Never merge solely by shared IP, user agent or inferred fingerprint.
- Consent and privacy scope are explicit. Do not expose raw private notes or sensor samples in general analytics.
- All displayed metrics have a definition, timezone, date range, source and freshness status.

## Minimum event taxonomy
app_open, session_start, session_end, pattern_impression, pattern_open, pattern_active_duration, pattern_close, recommendation_impression, recommendation_click, favorite_add, favorite_remove, registration_start, registration_complete, experiment_assignment, feedback_submitted, client_error, ingestion_failed.
Do not stream high-frequency pointer movements by default. Record only consented research replay where separately enabled.

## Pattern metrics
- Exposure = one unique pattern_open per event ID; impression is a separate denominator.
- Active duration = foreground, visible, actually active intervals; merge overlaps per session/pattern before summing.
- Unique users = deduplicated verified account IDs, plus unlinked guest installation IDs, never count a linked guest twice in cross-identity totals.
- CTR = recommendation_click / recommendation_impression with same placement and window.
- Outcome = measured pre/post change with sample size and confidence intervals; do not equate association with causal effect.
- Show data quality and sample size. Separate personal and cohort evidence, and segment by goal.

## Recommendation system
- Relevance combines explicit goal, personal interaction history, opt-in feedback, content metadata, safety constraints, novelty and cohort-level evidence.
- Cold start: use goal and curated defaults; never pretend to have measured effectiveness.
- Track recommendation impressions, clicks, opens, active time, dismissals and post-session feedback.
- Exclude unpublished patterns and honor the same publication and ordering policy as frontend.
- Log model/rule version and explanation tags for auditability. Allow holdouts and experiments.
- Prevent feedback loops by separating randomized exploration from exploitation and by controlling for popularity/exposure bias.
- Never infer diagnoses or sensitive attributes from engagement signals.

## Growth and commerce
- Campaign, UTM, landing page, referral attribution and verified account conversion are linked through consented first-party identifiers.
- Partner roles have access only to their own aggregate attribution and settlements; no raw medical or private research data.
- Subscriptions and revenue are reconciled to billing provider receipts, not inferred from click events.

## Rollout gates
1. Revoke publicly embedded administrator credential and deploy verified role-based admin authentication.
2. Server-side ingestion with validation, rate limiting, batching, retries and idempotency.
3. Guest, account, registration-transition and offline-retry end-to-end tests against production-equivalent environment.
4. Reconcile historical aggregates and document source-specific gaps.
5. Switch V6 panels and recommendations to verified unified metrics only after parity checks.
6. Rollback to preserved pre-V6 branch if quality gates fail.

## Проверка доставки V2 — факт входа ≠ факт получения события (2026-11-12)
- В защищённой копии админки V6 показывать последнюю подтверждённую дату входа аккаунта из таблицы аккаунтов независимо от receipt-событий V2. Это агрегированная дата, не список идентичностей.
- Ноль аккаунтных событий V2 нельзя называть доказательством сбоя, если не наблюдалась новая работа аккаунта в обновлённом клиенте; но отсутствие событий также не доказывает успешную доставку.
- Автоматическая статистика и идентификация пользователей никогда не достраиваются фиктивными визитами, сессиями или связями. Гость и аккаунт связываются только после проверки владения устройством и согласия.
- Исторические V40/V41 и новые V2 не суммируются без верифицированной дедупликации, а субъективные оценки не трактуются как клинические эффекты.
- Стабильную админку V4 не изменять. Новую диагностику выводить только в независимой копии V6, без отдельной вкладки.


## Исключение автоматизированных браузерных проверок из пользовательской аналитики (2026-11-12)

- На публичных доменах SETKA фронтовые коллекторы V2/V3 гостя и V2/V4 авторизованного пользователя **не запускаются** при `navigator.webdriver === true`; то же правило исключает автоматизированное воспроизведение музыки из реальных счётчиков прослушивания.
- Локальные браузерные тесты по `localhost` и `127.0.0.1` продолжают собирать тестовые события в изолированных фикстурах и проверять функции, но никакие автоматизированные production-прогоны не должны пополнять реальные пользовательские счётчики.
- Правило влияет на измерение реальной аудитории, не меняет медиа/орбиты/паттерны, не удаляет историю, не собирает дополнительные идентификаторы.
- В уже накопленных гостевых событиях до выхода исправления нельзя гарантировать чистоту от автоматизации: в течение нескольких часов 12.11 замечено аномальное совпадение всплеска новых устройств с массовыми CI WebKit/Chromium прогонами. **Не удалять и не переименовывать старые события без проверяемого источника.** При описании исторической аудитории учитывать возможную примесь.
- Проверки: `tests/setka-telemetry-automated-production.test.mjs`, все браузерные тесты V34 и музыкальные Chrome/WebKit проверки на реальные файлы.
