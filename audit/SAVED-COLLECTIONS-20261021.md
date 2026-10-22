# Saved collections incident, 2026-10-21

Baseline: 0b8295a56e1eed39b57c3416c4447757912fac92. Correct research UI: standalone-research-admin-v1.html.

Read-only production evidence: the community API returned 2 configurations; the retained private archive contained 11 favorites (none matched recorded removal IDs). Historical storage retained 115 save relations, 53 distinct configuration keys, across 34 historical devices. These are aggregate observations, not proof that every historical record belongs to the reporting user. No credentials or private note contents were retrieved, and no production records were reassigned or deleted.

Defects:
- Cloud favorite hydration swallowed storage failures and still authorized the partial local list for further synchronization.
- Favorites had no durable IndexedDB fallback despite the personal archive having one.
- Community switched to account-derived metrics and excluded historical saved recipes.
- Two UI modules erased legacy local recipe recovery evidence.

Changes: favorite restoration awaits durable persistence and uses the existing owner-scoped personal archive; failed hydration blocks authoritative uploads. Historical recipes are included in community with distinct historical save counts, without treating devices as current accounts or exposing identifiers. Legacy local recipes remain intact. Loading failures are visible inline.

Validation: 109 local tests passed. Browser test covers three different cloud recipes, saving a fourth via the heart, full localStorage, IndexedDB offline reload, logout and password login. Chromium/WebKit CI receipts are attached to PR #51. Do not treat pending CI as passed.

Limits: the reporting user's browser/session is not available here. Historical device records must not be silently assigned to an account. This change does not mutate those ownership records or retroactively label historical activity as authenticated-account activity. Production SQL and the account archive service are unchanged. Rollback is a forward revert of the PR plus redeploying the previous community service source; retained records remain compatible.
