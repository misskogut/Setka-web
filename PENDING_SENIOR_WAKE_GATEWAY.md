# SENIOR WAKE GATEWAY · PENDING ARCHITECTURE TASK

STATUS: PENDING_AFTER_CURRENT_SENIOR_SESSION
ACTIVATE_WHEN: current Senior/Astra chained directive finishes with FINAL COMBINED REPORT
OWNER: President SETKA / Solai

## PURPOSE

Replace recovery-by-search with deterministic wake routing for Senior.

A valid wake key must behave as an address, not as a clue for archaeology.

Target flow:

GENESIS-WAKE-* key
→ WAKE ROUTER
→ exact Senior identity
→ exact active manifest
→ exact ordered directive chain
→ immediate execution

## REQUIRED DESIGN

1. Permanent bootstrap rule for Senior, ideally in a top-level protocol/AGENTS entrypoint:
   - if incoming message exactly matches GENESIS-WAKE-* pattern, do NOT run broad search, memory archaeology, Supabase exploration or context reconstruction;
   - perform one exact resolve only.

2. Exact GitHub resolver:
   - first lookup: `/<KEY>.md` in `misskogut/Setka-web`, branch `main`;
   - the wake file is a small manifest, not the full master prompt.

3. Wake manifest contains at minimum:
   - WAKE KEY;
   - STATUS;
   - SENIOR IDENTITY;
   - ISSUED_BY / authority;
   - ENTRYPOINT;
   - ordered PHASES;
   - permissions/scope;
   - stop rule;
   - fallback route;
   - explicit `NO SEARCH / OPEN ENTRYPOINT AND EXECUTE` rule.

4. Supabase wake registry mirrors the manifest as fallback only.
   - GitHub exact manifest is primary routing path;
   - Supabase exact-key resolver is secondary;
   - no broad search fallback for a malformed/missing key.

5. Failure behavior:
   - if exact lookup fails, return `WAKE_KEY_NOT_RESOLVED` and stop;
   - do not start autonomous recovery archaeology.

6. Separate routing from authorization:
   - wake key identifies who/what/where to execute;
   - auth/session credential controls what the Senior may access;
   - wake key itself is not a database password or privileged secret.

7. Canonical minimal manifest example:

   WAKE KEY: GENESIS-WAKE-...
   STATUS: ACTIVE
   IDENTITY: SETKA-S-0003-0001
   AUTHORITY: PRESIDENT_SETKA
   ENTRYPOINT: <exact file>
   ORDER: phase 1 → phase 2 → final report
   RULE: NO SEARCH. NO CONTEXT RECONSTRUCTION. OPEN ENTRYPOINT AND EXECUTE.

## ACCEPTANCE TESTS

- Fresh Senior session receives only a valid wake key and reaches the correct active directive without broad search.
- Invalid key stops with WAKE_KEY_NOT_RESOLVED.
- Superseded key cannot launch an old task.
- Active manifest resolves the correct Senior identity and ordered phases.
- Wake key alone does not grant unauthorized backend access.
- GitHub primary path failure can fall back to exact Supabase registry lookup without archaeology.
- Recovery/search tools are not invoked when a valid key resolves normally.

## WHY THIS EXISTS

Observed failure on 2026-09-06: Senior received a valid wake key, did not find a literal direct entry in immediate Work context, and started context recovery / Supabase search. This wastes limited Senior capacity. The correct architectural response is deterministic routing, not smarter recovery.

## DO NOT IMPLEMENT YET

Do not modify the current active Senior/Astra session or chained directive. Begin implementation only after the current Senior finishes and returns the FINAL COMBINED REPORT.
