# SETKA · Public Pattern Info · Community Scope
Date 2026-10-11. Scope: standalone web v34 and open admin, with existing public Supabase feed.

## Problem
On a parent pattern information modal, the top metrics were cloud aggregates for connected Tester IDs but the "Для чего ты выбираешь паттерн" section read a single browser's `localStats(t).topIntents`. It put private and community histories into one card and could imply one person's goals were those of a community.

## Implemented
- Information modal now exclusively uses the cloud public feed. No fallback to local sessions, private states, private intent history or favorites.
- If cloud data is unavailable, values are "—", not invented or substituted from this browser.
- Header: "ПАТТЕРН · СООБЩЕСТВО". Visible scope always says these are currently connected Tester ID accounts, **not all downloads, people or anonymous guests**.
- Common goal section uses a separate, anonymized summary of consenting Tester ID private archives, deduplicated by account + pattern + session.
- Public goals are only released when each pattern/group has ≥3 distinct consenting Tester ID accounts and ≥5 unique sessions; small-group intents never leave the server. Categories whitelisted and no text notes, states, tester identifiers or detailed trajectories are returned.
- Earlier prototype pattern observations from v35 are shown **separately** as earlier tests and count devices, sessions and episodes, never added to v41 account counts; no older sensitive intent category is publicized.
- Open admin consumes the same data and shows matching scoped goals and historical separate totals.
- Personal per-user insights remain in existing "Я" features.

## Observed data (read-only)
- New account cohort: only **1 connected Tester ID**. Goal disclosure threshold therefore not met.
- Older v35 data: 732 recorded pattern exposures from 6 device IDs; Tentacle Orbit 395 exposures / 6 devices / 12 distinct sessions; Dandelion 337 exposures / 3 devices / 5 distinct sessions.
- Cohorts overlap and have different identity schemes; they cannot be added.
- Historical devices are not necessarily unique people, and not all app users are captured by either cohort.

## Tests
- Unit tests for consent filtering, threshold >=3 distinct accounts, >=5 sessions, dedup of repeated pattern exposures, non-disclosure of one individual's goals, separate older cohorts and pattern whitelist.
- Browser smoke: seven patterns have correct cloud numbers; injecting 70 **local** exposures does not change public goal percentages; a history of 395 archived uses does not increase 100 current uses in fixture.
- Open admin/mobile browser sees same goal and history, while private admin login stays protected.
- Chromium and WebKit run via GitHub Actions on branch.

## Limitations
- This does NOT claim data from every SETKA download/user. Anonymous viewers who never joined Tester ID have no v41 account events in current cloud.
- A single consenting participant must not produce publicly displayed goal breakdown. It will appear when enough consented testers generate data.
- Physical iPhone Safari smoke remains the user's manual verification; simulated WebKit is not a physical iPhone.
- No individual notes, account histories, Tester ID credentials or other private records were modified.
