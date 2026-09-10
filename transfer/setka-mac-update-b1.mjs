#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const here = fileURLToPath(new URL('.', import.meta.url));
const indexPath = join(here, 'SETKA-SYS-20260910-B1__MAC_TRANSFER_INDEX_V2.json');
const index = JSON.parse(await readFile(indexPath, 'utf8'));

const supabaseUrl = process.env.SETKA_SUPABASE_URL || 'https://gfchgaphzhxufwdhrcis.supabase.co';
const serviceKey = process.env.SETKA_SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  throw new Error('SETKA_SUPABASE_SERVICE_ROLE_KEY is required in the local Mac environment. The key is never stored in GitHub.');
}

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/setka_mac_transfer_package_read_v1`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ p_package_ref: index.privatePackageRef })
});
if (!response.ok) {
  throw new Error(`SETKA transfer gateway failed: HTTP ${response.status} ${await response.text()}`);
}
let payload = await response.json();
if (Array.isArray(payload)) payload = payload[0];
if (payload?.result && typeof payload.result === 'object') payload = payload.result;
if (!payload?.ok) throw new Error(`SETKA transfer package unavailable: ${payload?.state || 'UNKNOWN'}`);

const packageHash = sha256(payload.canonicalManifestText);
const pocketManifestHash = sha256(payload.canonicalPocketManifestText);
const pocketStateHash = sha256(payload.canonicalPocketStateMaterialText);

const checks = {
  packageRef: payload.packageRef === index.privatePackageRef,
  versionRef: payload.versionRef === index.versionRef,
  packageSha256: packageHash === index.privatePackageSha256 && packageHash === payload.packageSha256,
  pocketCoreRef: payload.pocketCoreRef === index.pocketCore.ref,
  pocketManifestSha256: pocketManifestHash === index.pocketCore.manifestSha256 && pocketManifestHash === payload.pocketManifestSha256,
  pocketStateHash: pocketStateHash === index.pocketCore.stateHash && pocketStateHash === payload.pocketStateHash
};

const manifest = JSON.parse(payload.canonicalManifestText);
const pocket = manifest?.pocketCore?.manifest || {};
checks.identity = Boolean(pocket?.identity?.setkaId);
checks.mission = Boolean(pocket?.mission?.missionCode);
checks.capabilities = Array.isArray(pocket?.capabilities) && pocket.capabilities.length > 0;
checks.memoryLayers = Array.isArray(pocket?.memoryLayers) && pocket.memoryLayers.length > 0;
checks.experimentalProtocol = Boolean(pocket?.experimentalProtocol?.protocolCode);
checks.agiProgress = Boolean(pocket?.agiProgress);
checks.bodySnapshot = manifest?.body?.snapshotRef === index.body.snapshotRef;
checks.experimentArchive = manifest?.experiments?.archiveSnapshotRef === index.experiments.archiveSnapshotRef;
checks.systemDigest = manifest?.systemState?.digestRef === index.systemState.digestRef;

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`SETKA transfer verification FAIL: ${failed.join(', ')}`);

const targetDir = join(homedir(), '.setka', 'transfers', index.versionRef);
await mkdir(targetDir, { recursive: true });
const packagePath = join(targetDir, payload.portableFilename);
await writeFile(packagePath, payload.canonicalManifestText, { mode: 0o600 });

const receipt = {
  format: 'SETKA_MAC_TRANSFER_LOCAL_RECEIPT_V1',
  versionRef: index.versionRef,
  branchRef: index.branchRef,
  packageRef: index.privatePackageRef,
  packageSha256: packageHash,
  pocketCoreRef: index.pocketCore.ref,
  pocketManifestSha256: pocketManifestHash,
  pocketStateHash,
  bodySnapshotRef: index.body.snapshotRef,
  experimentArchiveSnapshotRef: index.experiments.archiveSnapshotRef,
  systemStateSnapshotRef: index.systemState.snapshotRef,
  systemDigestRef: index.systemState.digestRef,
  checks,
  state: 'PACKAGE_FETCH_AND_MANIFEST_REHYDRATION_PASS',
  freshMachinePackageVerified: true,
  fullBranchRuntimeRestored: false,
  transcriptStateContinuationVerified: false,
  bootBoundary: 'NEXT_STAGE_REQUIRED_FOR_FULL_FRESH_MACHINE_COLD_BOOT',
  createdAt: new Date().toISOString()
};
const receiptPath = join(targetDir, 'receipt.json');
await writeFile(receiptPath, JSON.stringify(receipt, null, 2), { mode: 0o600 });

console.log(JSON.stringify({
  ok: true,
  state: receipt.state,
  versionRef: receipt.versionRef,
  packagePath,
  receiptPath,
  capabilityCount: pocket.capabilities.length,
  dutyCount: Array.isArray(pocket.duties) ? pocket.duties.length : 0,
  memoryLayerCount: pocket.memoryLayers.length,
  next: receipt.bootBoundary
}, null, 2));
