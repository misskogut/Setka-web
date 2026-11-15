# SETKA Web — public read-only demo failover, 2026-11-15

Scope: public SETKA Web static frontend, not SETKA Canon. This is a **non-destructive backup** for the current Supabase HTTP 402 incident.

## Published sources
- Existing pattern snapshot: `standalone-catalog-public-snapshot-v1.json`, 26 published patterns, last verified server revision 57.
- Music: `standalone-music-public-snapshot-v1.json`, 26 currently published tracks with GitHub Release assets independently matched by recorded bytes and SHA-256 digests. The published **Мур** is only in Supabase Storage and **Монахи** has no matching asset in the current GitHub Release; neither is claimed as available offline.
- Community: `standalone-community-public-snapshot-v1.json`, 14 aggregate pattern configuration cards from the same published, registered-account-only metrics view used by the public feed. No tester IDs, device IDs, private archives, private notes, or personal session records are exported.

## Fallback policy
1. Live Supabase API succeeds -> render fresh live data. Do NOT merge snapshots into the canonical database or overwrite new live revisions.
2. Live API fails, including HTTP 402 -> if no live catalog has been confirmed in this visit, load the static snapshot from same-origin GitHub Pages. Communicate that data may be stale.
3. Community backup is **read-only**: no fake saves, upload attempts or fake server acknowledgements. Notes/publication and account writes still require real Supabase APIs.
4. Music backup contains published metadata only; audio is streamed from pre-existing GitHub Release assets, not via the blocked Supabase streaming proxy. Normal HRTF/WebAudio is attempted; if unsupported by browser CORS/range restrictions, explicit native stereo fallback may work without spatialization. **Real-device audio validation is still required.**
5. Neither snapshot is a database backup. Guest/auth identity, individual events, user states and server sync stay in Supabase and the existing local queue. Deleting app data may delete unsynced local records.

## Operations and limitations
- Current snapshots are static, not continuously synced. Regenerate only from newly verified published data after publication changes, especially unpublish/takedown.
- Run `node --test tests/setka-demo-public-failover.test.mjs` and GitHub PR/Pages gates. Exercise a real iPhone and desktop with Supabase artificially failing, then test normal server recovery.
- No Supabase SQL changes, deletes, Storage moves, new paid services or changes to Canon are necessary.
- GitHub Pages has a soft bandwidth limit and is not approved as commercial SaaS hosting; this is a temporary demo failover, not a scaled permanent music CDN.
- Supabase HTTP 402 still prevents live community updates, server-authoritative saves, research ingestion and full administrator functions.
