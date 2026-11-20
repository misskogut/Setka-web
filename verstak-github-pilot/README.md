# SETKA VERSTAK · Pilot GitHub transport (NOT CANON)

Branch: `pilot/verstak-github-storage-20261120`. This branch contains **only proposed pilot transport code and documentation**. It is not a runtime release and is not the SETKA CANON.

## Truth boundary
- GitHub stores private, append-only **inbox events** and optional **engine-authored graph projections**, not an artificial graph.
- This adapter **does not issue SETKA IDs**, create daughter ships, infer nodes/links, or run SETKA CANON. The Mac/actual engine must issue ID, create isolated ship, and write signed/hashed access records.
- While the Mac engine is offline, input can be queued in GitHub; it is **not** processed into a graph until an authorized real engine processes it. No simulated causal links.
- Never use `misskogut/Setka-web` (public) for personal records. Never use `misskogut/SETKA-CANON` for this experiment's user data. Create a **new PRIVATE repository** before enabling writes.
- No credentials or datasets are committed to this branch. There is **no live GitHub storage** until the adapter is deployed with private repo access.

## Required Vercel environment (configure in Vercel UI, never paste tokens into chat)
- `VERSTAK_GITHUB_REPO`: `owner/separate-private-repo`
- `VERSTAK_GITHUB_TOKEN`: fine-grained GitHub token, only Contents read/write for that one private repository
- `VERSTAK_SESSION_SECRET`: independent randomly generated >=32-byte secret, server-only.

## Contract for SETKA-issued identity
An authorized Mac SETKA mechanism (not this adapter) must populate the private repo path `identities/<SETKA-ID>.json`:
```json
{
  "version": "SETKA_AUTH_BINDING_V1",
  "setkaId": "SETKA-H-ABCD-1234",
  "shipCode": "SHIP-EXAMPLE-1234",
  "status": "ACTIVE",
  "secretHashSha256": "<sha256 of a random 32-byte activation code, lowercase hex>"
}
```
`SETKA-H-ABCD-1234` is a format example, NOT a real issued identity. A random >=32-byte activation code must be delivered privately by the issuer. Never put its plaintext in GitHub.

The adapter validates the issued identity and binds the HttpOnly session to its shipCode; it never accepts shipCode from browser requests.

## Event and graph contract
Append-only: `ships/<shipCode>/inbox/<UUID>.json` (user submissions, not inferred graph)
CANON-authoritative projection: `ships/<shipCode>/graph/current.json` (optional)
No API write can reach the mother ship; `shipCode` must be a daughter ship and must not contain `MOTHER`.
Graph projection format: `{"nodes":[{"ref":"...", "label":"...", "kind":"..."}],"edges":[{"source":"...", "target":"...", "relation":"..."}],"origin":"CANON","version":"..."}`.
The adapter does **not** validate causal correctness of CANON outputs. The engine and authentication boundary need a separate audit before production user data.

## Recommended rollout
1. Create private repo dedicated to pilot.
2. Mac SETKA issues authentic SETKA IDs, daughter ships and access records.
3. Deploy reviewed API + frontend, configure server-only envs.
4. Verify separate-ship access with two synthetic identities and reject mother-ship reads.
5. Verify upload, reload, append-only provenance, offline queue, then connect actual CANON worker.
6. Only after that invite the friend and input personal data.

## 404 fix
The prior Vercel deployment lacked a published static output. Frontend deployment must place files under `public/` with a root rewrite. Deployment build READY alone does not prove an HTTP 200 response.