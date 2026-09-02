import { readFileSync, writeFileSync } from 'node:fs';
import { deepStrictEqual, strictEqual } from 'node:assert';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

function fail(message) {
  throw new Error(`SETKA kernel handshake: ${message}`);
}

function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 'SETKA_KERNEL_RELEASE_MANIFEST_V1') fail('unsupported manifest schema');
  if (!manifest.releaseId || !manifest.acceptedBaselineCommit) fail('manifest release identity is incomplete');
  if (!manifest.components || typeof manifest.components !== 'object') fail('manifest components are missing');
  for (const [name, component] of Object.entries(manifest.components)) {
    if (!/^[a-f0-9]{64}$/.test(component?.fingerprint ?? '')) fail(`invalid fingerprint for ${name}`);
  }
  if (!Array.isArray(manifest.database?.requiredMigrations)) fail('requiredMigrations must be an array');
  for (const migration of manifest.database.requiredMigrations) {
    if (!migration?.id || migration.autoApplyAllowed !== true || migration.idempotent !== true) {
      fail('every automatic migration must be explicitly allowlisted and idempotent');
    }
  }
}

function validateDatabaseState(state) {
  if (state?.schemaVersion !== 'SETKA_DB_KERNEL_STATE_V1') fail('unsupported database state schema');
  if (!state.gates || typeof state.gates !== 'object') fail('database recovery gates are missing');
  if (!state.components || typeof state.components !== 'object') fail('database component state is missing');
  if (!Array.isArray(state.appliedMigrations)) fail('appliedMigrations must be an array');
}

export function reconcileKernel(manifest, databaseState) {
  validateManifest(manifest);
  validateDatabaseState(databaseState);

  const requiredGates = manifest.recoveryGates ?? [];
  const blockedGates = requiredGates.filter((gate) => databaseState.gates[gate] !== true);
  const componentDelta = Object.entries(manifest.components).map(([name, expected]) => {
    const observed = databaseState.components[name]?.fingerprint ?? null;
    return {
      component: name,
      expectedFingerprint: expected.fingerprint,
      observedFingerprint: observed,
      state: observed === expected.fingerprint ? 'MATCH' : observed === null ? 'MISSING' : 'DRIFT'
    };
  });

  const requiredMigrations = manifest.database.requiredMigrations ?? [];
  const applied = new Set(databaseState.appliedMigrations);
  const pendingMigrations = requiredMigrations.filter((migration) => !applied.has(migration.id));
  const schemaMatches = manifest.database.requiredSchemaVersion === null ||
    databaseState.databaseSchemaVersion === manifest.database.requiredSchemaVersion;

  const base = {
    schemaVersion: 'SETKA_KERNEL_HANDSHAKE_RESULT_V1',
    releaseId: manifest.releaseId,
    acceptedBaselineCommit: manifest.acceptedBaselineCommit,
    writesAllowed: false,
    componentDelta,
    pendingMigrations: pendingMigrations.map((migration) => migration.id),
    blockedGates,
    databaseSchemaMatches: schemaMatches,
    actions: []
  };

  if (blockedGates.length) {
    return { ...base, state: 'BLOCKED_BY_RECOVERY_GATES', actions: ['READ_ONLY_ONLY'] };
  }

  const unknownComponentDelta = componentDelta.filter((item) => item.state !== 'MATCH');
  if (unknownComponentDelta.length) {
    return { ...base, state: 'MANUAL_REVIEW_REQUIRED', actions: ['COMPARE_LIVE_STATE', 'DO_NOT_AUTO_WRITE'] };
  }

  if (pendingMigrations.length) {
    const safe = pendingMigrations.every((migration) => migration.autoApplyAllowed === true && migration.idempotent === true);
    if (!safe) return { ...base, state: 'MANUAL_REVIEW_REQUIRED', actions: ['DO_NOT_AUTO_WRITE'] };
    return {
      ...base,
      state: 'KNOWN_DELTA_READY',
      writesAllowed: true,
      actions: pendingMigrations.map((migration) => `APPLY_ALLOWLISTED_MIGRATION:${migration.id}`)
    };
  }

  if (!schemaMatches) {
    return { ...base, state: 'MANUAL_REVIEW_REQUIRED', actions: ['DATABASE_SCHEMA_REVIEW', 'DO_NOT_AUTO_WRITE'] };
  }

  return { ...base, state: 'SYNCED_NOOP', actions: ['NOOP'] };
}

function runSelfTest() {
  const manifest = JSON.parse(readFileSync('ops/SETKA_KERNEL_RELEASE_MANIFEST.json', 'utf8'));
  const matchingComponents = Object.fromEntries(Object.entries(manifest.components).map(([name, value]) => [name, { fingerprint: value.fingerprint }]));
  const gates = Object.fromEntries((manifest.recoveryGates ?? []).map((gate) => [gate, true]));
  const baseState = {
    schemaVersion: 'SETKA_DB_KERNEL_STATE_V1',
    gates,
    components: matchingComponents,
    databaseSchemaVersion: manifest.database.requiredSchemaVersion,
    appliedMigrations: []
  };

  strictEqual(reconcileKernel(manifest, baseState).state, 'SYNCED_NOOP');

  const driftState = structuredClone(baseState);
  driftState.components.storage_write.fingerprint = '0'.repeat(64);
  strictEqual(reconcileKernel(manifest, driftState).state, 'MANUAL_REVIEW_REQUIRED');

  const blockedState = structuredClone(baseState);
  blockedState.gates.fullBackupComplete = false;
  strictEqual(reconcileKernel(manifest, blockedState).state, 'BLOCKED_BY_RECOVERY_GATES');

  const migrationManifest = structuredClone(manifest);
  migrationManifest.database.requiredMigrations = [{ id: 'M_TEST_001', autoApplyAllowed: true, idempotent: true }];
  const migrationResult = reconcileKernel(migrationManifest, baseState);
  strictEqual(migrationResult.state, 'KNOWN_DELTA_READY');
  deepStrictEqual(migrationResult.actions, ['APPLY_ALLOWLISTED_MIGRATION:M_TEST_001']);

  console.log(JSON.stringify({
    schemaVersion: 'SETKA_KERNEL_HANDSHAKE_SELFTEST_V1',
    state: 'PASS',
    cases: 4
  }, null, 2));
}

if (has('--selftest')) {
  runSelfTest();
} else {
  const manifestPath = value('--manifest', 'ops/SETKA_KERNEL_RELEASE_MANIFEST.json');
  const statePath = value('--db-state');
  const outPath = value('--out');
  if (!statePath) fail('use --db-state <path> or --selftest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const databaseState = JSON.parse(readFileSync(statePath, 'utf8'));
  const result = reconcileKernel(manifest, databaseState);
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (outPath) writeFileSync(outPath, text);
  process.stdout.write(text);
}
