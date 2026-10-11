# SETKA · Tester ID / Browser Ownership Integrity
Date: 2026-10-11 · scope: standalone web prototype + Supabase, not Flutter/Django.

## Fixed: account/device boundary
- `setka-tester-account-v40` was capable of overwriting the device's `subject_key` during a successful login or password recovery, even if the device belonged to a different Tester ID.
- `ensureDevice` now compares existing device ownership, private archive ownership and active claim ownership before any rebind; conflict = `device_already_has_tester_id` (HTTP 409).
- `guest`/unowned legacy device is allowed a **first** Tester ID claim; it cannot silently switch afterward.
- Compare-and-swap checks block concurrent reassignments from the same guest identity. Login updates and token issuance occur **after** successful ownership validation; recovery password mutation likewise.
- Legacy `setka-standalone-v34` heartbeat now updates device metadata **without changing `subject_key`**. The older, divergent GitHub index was backed up; canonical repo source aligned to deployed v11 implementation.
- `setka-tester-archive-v37` requires both the account token and matching **device hash** for `pull`, `status`, and `sync`, plus actual device ownership for account archive reads and writes.
- Front end supplies device ID on archive pull and status requests. Both changed scripts use new cache-busting versions, preserving existing local browser data.

## Production versions
- Account backend: v8 → v9
- Legacy heartbeat: v11 → v12
- Private archive: v10 → v11
- User JS: `standalone-private-corpus-v40.js?v=50-account-boundary-1` and `standalone-tester-cabinet-v40.js?v=50-account-boundary-1`.
- Backup branch: `backup/main-before-account-boundary-20261011`.
- Exact predeploy backend snapshots: `backups/20261010/setka-tester-account-v40-before-isolation.ts`, `backups/20261010/setka-standalone-v34-before-device-guard.ts`. Private archive v10 already held in `supabase/functions/setka-tester-archive-v37/index.ts` in the backup branch.

## Tests
`tests/setka-tester-account-ownership.test.mjs` exercises:
1. New devices A1 and A2 may belong to A, and A1 can reauthenticate as A.
2. Device A cannot silently log in as B.
3. Existing private archive / claimed device cannot be taken over if device registry is empty.
4. Legacy guest can become A once, then rejects B.
5. Concurrent attempts to claim same unowned device cannot both succeed.
6. Account login refuses a conflict before updating login activity and issuing a token; recovery refuses before mutating password.
7. Private archive session pull requires matching device hash. Front end must send device ID.
8. Old heartbeat never overwrites owner field.
Existing browser regression suite covers seven patterns, note snapshots, open/private admin and Chromium/WebKit flows.

## Data checks
Read-only aggregate counts after deploy matched their predeploy levels: 98 legacy device records, one private archive, 37 account exposure rows, three account session rows. This alone cannot establish user-session login success.

## Known limitations
- Not a two-device live credential test. Account/claim/recovery regression tests use mock database and synthetic Testers A/B; no real user password, token or archive is used.
- Browser-local note history remains stored locally after logout by design. The UI now warns users; do not use a shared browser for different Tester IDs.
- A separate browser/device is required for a different Tester ID while cross-account transfer/migration is not designed. Never delete existing browser storage to evade ownership checks.
- Already-open tabs running cached older JS may need a reload before archive reads; server returns auth error rather than leaking data.
- Owner identity is tied to local device ID; deliberate device-ID tampering, compromised JS origin, or copied authentication credentials are not fully prevented by this prototype architecture.
- Admin real credentials, second iPhone, and Flutter/Django deployment were not validated.

## Next acceptance flight
Two synthetic accounts with legitimate separate login credentials on two real devices. Create notes with identical text but different pattern IDs, edit/reopen/reload, verify correct private archive and admin (protected) history per account. Test recovery and deliberate cross-account login denial; never log raw tokens/passwords. Only then close GitHub issue #6.
