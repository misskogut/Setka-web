# SETKA APP · REGISTER OF PRODUCT RULES AND AUTOMATED GUARANTEES

**Status:** living product acceptance ledger; current policy from 2026-10-21. **Applies only to SETKA App**, not to VERSTAK/CANON/Foundation/Diamond.

Read with [SETKA_APP_CANONICAL_CONTRACT.md](../SETKA_APP_CANONICAL_CONTRACT.md), [PATTERN_PLATFORM_V2.md](PATTERN_PLATFORM_V2.md), [SETKA_DATA_MODEL_V1.md](../SETKA_DATA_MODEL_V1.md) and root [AGENTS.md](../AGENTS.md). If implementation conflicts with a rule, fix the implementation *and* add executable proof — don't change the rule to disguise the regression.

## No more one-off pattern wiring

**Allowed action when introducing another pattern:** author **one** `standalone-pattern-<id>.js` file with a declarative `SETKA_PATTERN_DESCRIPTOR` and its own renderer (the source p5/other algorithm is adapted to the platform once). The descriptor carries stable `id`, `version`, `schemaVersion`, `introducedAt` (actual immutable first release time), complete `defaults`, 1–9 palettes, `colorModes`, controls/gestures, schema and render entry point.

**The rest is a consequence of the platform**: registry, runtime, library tile, dynamic preview, game view, color UI, slider/help, first-view badge/order, favorite, config key, immutable note snapshot, community data, research view and Replay. A consumer has no reason to check a newly packaged ID by literal name. A generic enhancement belongs in the generic subsystem, **not** in each new renderer. There is no per-pattern SQL/manual front/admin list.

The builder (`scripts/build-pattern-manifest.mjs`) discovers packages, rejects invalid descriptors and generates matching runtime registry and server manifest. The CI zero-touch boundary guard (`tests/setka-app-platform-guard.test.mjs`) rejects direct new-ID references from shared consumers. Existing, historically integrated legacy algorithms remain versioned built-ins until separately migrated safely.

### Current one-file module chronology (historical evidence, NOT a manual runtime ordering table)

- `rain`: first published 2026-10-21T17:23:24.000Z.

These facts are stored *only* as `introducedAt` inside their descriptors. Any future module gets its own introduction date and is ordered automatically; never edit this list to register or reorder software.

**Withdrawal 2026-10-22:** `orbital-threads` was previously public and is now explicitly retired at the owner's request. Its former source/descriptor remain recoverable in Git history, **not** in the active package directory, registry or manifest. No archive row, user note, favorite, session or community record may be deleted, overwritten or reassigned to a different algorithm during retirement. Historical unknown references remain labelled unavailable until a separately approved archival-view mechanism exists. Retired does not mean never existed.

## Product acceptance register

| Rule | Non-negotiable behavior | Proof / maturity |
| --- | --- | --- |
| APP-001 | One pattern package → all front/research surfaces through one registry; no hardcoded new IDs in shared consumers | **CI enforceable:** builder + auto-discovery test + zero-touch guard |
| APP-002 | New pattern starts as white drawing on black; existing color modes/saved index are never silently reordered | **CI enforceable:** descriptor and renderer tests; actual device visual QA still required |
| APP-003 | Every slider/gesture changes the described parameter; key explains exact finger count, zone and direction, no “Точная настройка” | **CI tested:** platform/browser tests; real device touch tests required |
| APP-004 | Unviewed pattern = top (newest first, `new`); viewed = bottom in immutable chronological *release* order (oldest first), **not tap order** | **CI tested:** chronology and browser reload tests; real account state not exhaustively verified |
| APP-005 | A saved configuration/Note/Replay points to its actual versioned pattern, config and frame; no substitution by default Octopus/Tentacle | **CI partial:** snapshots/round-trip; old archives and real-device recovery remain open |
| APP-006 | Library, favorites and community previews use the same renderer/config as gameplay; centered tiles with continuous scheduling | **CI partial:** renderer and browser smoke; iPhone FPS / long scroll unverified |
| APP-007 | A temporary missing renderer, API failure or login hiccup does not delete or rewrite the original favorite/note/state | **CI partial:** recovery tests; verify historical user snapshots with backup |
| APP-008 | Community displays only real server-confirmed saves/likes; count definitions, filters, sorting and zero/unknown are unambiguous | **CI partial:** feed schema and stale/error→recovery browser test in `tests/setka-front-research-audit-browser.mjs`; full production reconciliation outstanding |
| APP-009 | Personal history ≠ community pattern analytics ≠ research read model | **Contract; integration verification ongoing** |
| APP-010 | Real BPM comes only from a real paired sensor with timestamp and provenance; otherwise show no measurements | **Contract / partial implementation; physical-device verification outstanding** |
| APP-011 | Session, timeline, PatternExposure, states and before/after scores reflect actual observed intervals/events | **Contract / partial tests; end-to-end real session still needs verification** |
| APP-012 | Personal and public notes are distinct; create free note without pattern or immutable note with accurate config | **CI partial:** note snapshots; cross-device confirmation outstanding |
| APP-013 | Front and research admin read one versioned catalog; edited names/defaults propagate with revision and do not alter historical snapshots | **CI partial:** Research Admin now shows a true incomplete status on catalog outage; isolated six-screen/browser tests added; 15s/30s polling, NOT true push |
| APP-014 | Sync correctness: idempotent writer, confirm read-back, reconnect/resume, revision/cursor, account isolation, no stale overwrite | **TARGET / NOT FULLY VERIFIED**; implement incrementally with real tests |
| APP-015 | Real-time delivery: verified front↔server↔research propagation with p50/p95 latency budgets and live freshness status | **TARGET / NOT IMPLEMENTED AS END-TO-END PUSH**; do not call polling “instant” |
| APP-016 | No fake counters, decorative activity, random BPM, guessed metrics or fabricated completion banners | **Contract / targeted tests; add provenance validation per metric** |
| APP-017 | Lower menu: Сегодня / Заметки / Пульс / Состояния / Я; inline expanding sheets, no unwanted blocking popups | **Partial implementation; remaining legacy dialogs need audit** |
| APP-018 | Audio reactivity changes real supported pattern parameters, does not overwrite user's base config or fabricate sound | **Partial implementation; audio/live device verification outstanding** |
| APP-019 | New release preserves all previously working pattern, saved, note, admin and community features; no full-page redraw on one tile reorder | **CI smoke partial:** source-library return, favorite save/open/un-save and front/research flow now covered in `tests/setka-front-research-audit-browser.mjs`; physical-device canary remains required |
| APP-020 | No new architecture “shortcut” that duplicates truth, throws away legacy records, or creates isolated front/admin adapters | **Architecture acceptance rule; enforced incrementally by source checks and reviews** |
| APP-021 | **WITHDRAWN:** experimental Orbital Threads trail-fidelity rule was tied to a pattern the owner rejected. It no longer imposes rendering requirements on future modules; do not resurrect that pattern via another animation patch. | **Retired 2026-10-22 / superseded by APP-022** |
| APP-022 | Explicitly retired one-file algorithms are absent from front library, public/community active catalog, generated server manifest and research pattern selectors. The canonical package removal propagates without per-surface exceptions. Existing account snapshots, notes, favorites and history retain original identity/content and must not silently become Tentacle or be deleted. | **Retirement source + auto-discovery and browser regression added; CI/Pages/deployment/device status tracked separately** |
| APP-023 | Deleting a one-file pattern automatically removes it from **every active front, Saved, Community, public notes, recommendations, public server feed/metrics and research pattern selector** through the sole published registry/manifest; adding a new one follows the inverse route with no per-ID UI or SQL edits. An unavailable/retired recipe must create **zero** placeholder cards or archive panels in active Saved, but its immutable account-owned snapshot/note/session history remains in storage for later recovery/export, never replaced by a default algorithm. All exposed active counts exclude withdrawn recipes. | **Shared active projection + front/server filtering + browser and generic lifecycle tests added; Supabase live rollout and iPhone visual check must be separately proven** |

**Vocabulary:** `CI enforceable` means an executable guard runs on repository code; `CI partial` means some scenarios are automated but not all devices/accounts; `TARGET` means a required capability is not yet demonstrated. **Never convert TARGET to DONE merely by changing this document.**

## Rule intake: how every future conversation decision becomes a feature of SETKA

1. **Interpret:** extract precisely what the user asked as an observable invariant. State whether it applies to the entire app, all future packages, or a genuinely specific algorithm. Confirm against existing constraints; preserve original algorithm, colors and user data.
2. **Find one owner:** locate the canonical source (pattern descriptor, registration builder, shared renderer/key, snapshots, data store, API, research read model), never add another competing source.
3. **Update the rule ledger:** add or refine the corresponding `APP-XXX` row **in the same change as the code**. Update `SETKA_APP_CANONICAL_CONTRACT.md` or the specialized contract if the behavior is cross-cutting. Do not invent “done” state.
4. **Encode execution:** implement an automatic platform mechanism. A rule tied to a new package must work when the next *unknown* package file is dropped into the directory. Extend declarative schema/engine, not front/admin per-ID switches.
5. **Prove:** add a generic fail/pass regression (new unknown ID fixture; correct previews, exact config/replay/ordering, account/permissions/unknown data, device/browser if relevant). Add tests to CI **and** to the Pages release gate where applicable.
6. **Release safely:** PR → affected tests + full necessary regression → merge → Pages deploy evidence → real device/session validation. Record unverified integrations explicitly. Preserve rollback and old records.
7. **Carry forward:** later development sessions must read root `AGENTS.md`, this ledger and canonical contract **before writing code**. Source of truth for product law is Git, not remembered chat snippets.

## Acceptance for “fully autonomous, Swiss-clock stable”

A product build is not "Swiss-clock stable" on declaration. It needs:

- A new pattern recognized with zero edits to consumer files;
- End-to-end exact preservation of configs across save → notes → community → research → reload;
- Two-client synchronization + reconnection proof with observed p50/p95 delivery latency;
- No false metrics, owner leaks or lossy archive migrations;
- Stress/long-scroll testing with measured iPhone/WebKit FPS, resource budget and memory;
- No known blocking regressions in CI or real-device test matrix, plus quick rollback.

Until each row is proven, report the remaining failures and work against the shared platform, not against individual pattern names.

**No automatic memory claims:** ChatGPT conversational memory may not update synchronously. Repository rules are durable, versioned and can be inspected by every future developer or agent.
