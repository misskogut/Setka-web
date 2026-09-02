import { readFileSync, writeFileSync } from 'node:fs';
import { deepStrictEqual, strictEqual, throws } from 'node:assert';

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
  if (!manifest.releaseId || !manifest.dbRelevantSourceBaselineCommit) fail('manifest release identity is incomplete');
  if (!manifest.components || typeof manifest.components !== 'object') fail('manifest components are missing');
  for (const [name, component] of Object.entries(manifest.components)) {
    if (!/^[a-f0-9]{64}$/.test(component?.fingerprint ?? '')) fail(`invalid fingerprint for ${name}`);
  }
  if (!Array.isArray(manifest.database?.requiredMigrations)) fail('requiredMigrations must be an array');
  for (const migration of manifest.database.requiredMigrations) {
    if (!migration?.id || !/^[a-f0-9]{64}$/.test(migration?.contentHash ?? '') || migration.autoApplyAllowed !== true || migration.idempotent !== true) {
      fail('every automatic migration must have an exact contentHash and be explicitly allowlisted + idempotent');
    }
  }

  const transcript = manifest.transcriptIntegration;
  if (!transcript || transcript.activityCode !== 'KERNEL_RECONCILIATION') fail('kernel transcript integration policy is missing');
  if (transcript.noopCanonicalWrite !== false) fail('SYNCED_NOOP must remain causal silence');
  if (transcript.completionRequiresTranscriptReadback !== true) fail('kernel sync completion must require transcript read-back');
  if (transcript.operationIdRequired !== true) fail('state-changing kernel sync requires operation_id');
  if (transcript.recoveryCheckpointRequiredBeforeStateChange !== true) fail('state-changing kernel sync requires recovery checkpoint evidence');
  const requiredSubtypes = ['started', 'completed', 'failed', 'reviewRequired', 'reverted', 'reapplied'];
  for (const key of requiredSubtypes) if (!transcript.subtypes?.[key]) fail(`missing transcript subtype ${key}`);
  const rollback = transcript.rollbackPolicy;
  if (!rollback?.historyIsAppendOnly || !rollback?.revertCreatesNewEvent || !rollback?.reapplyCreatesNewEvent) {
    fail('rollback/reapply must be append-only new history');
  }
  const classes = new Set(rollback.classes ?? []);
  for (const required of ['REVERSIBLE', 'FORWARD_FIX_ONLY', 'IRREVERSIBLE']) {
    if (!classes.has(required)) fail(`missing rollback class ${required}`);
  }
}

function validateDatabaseState(state) {
  if (state?.schemaVersion !== 'SETKA_DB_KERNEL_STATE_V1') fail('unsupported database state schema');
  if (!state.gates || typeof state.gates !== 'object') fail('database recovery gates are missing');
  if (!state.components || typeof state.components !== 'object') fail('database component state is missing');
  if (!Array.isArray(state.appliedMigrations)) fail('appliedMigrations must be an array');
}

function transcriptPlan(manifest, mode, extra = {}) {
  const t = manifest.transcriptIntegration;
  const base = {
    activityCode: t.activityCode,
    activityNameRu: t.activityNameRu,
    actor: t.actor,
    canonicalEventFamily: t.canonicalEventFamily,
    canonicalWriteRequiredNow: false,
    completionRequiresTranscriptReadback: t.completionRequiresTranscriptReadback,
    operationIdRequiredForStateChange: t.operationIdRequired,
    recoveryCheckpointRequiredBeforeStateChange: t.recoveryCheckpointRequiredBeforeStateChange,
    mode
  };

  if (mode === 'NONE') return { ...base, reason: extra.reason ?? 'NO_CAUSAL_CHANGE' };
  if (mode === 'REVIEW_SIGNAL_IF_NEW') {
    return {
      ...base,
      subtype: t.subtypes.reviewRequired,
      dedupeRequired: true,
      reason: extra.reason ?? 'MANUAL_REVIEW_REQUIRED'
    };
  }
  if (mode === 'STATE_CHANGE_PAIR_ON_EXECUTION') {
    return {
      ...base,
      onExecution: {
        startedSubtype: t.subtypes.started,
        completedSubtype: t.subtypes.completed,
        failedSubtype: t.subtypes.failed,
        requiredLinks: ['operation_id', 'release_id'],
        requiredStateEvidence: ['before_state_hash', 'after_state_hash'],
        completionBoundary: 'TRANSCRIPT_COMPLETED_EVENT_READ_BACK'
      },
      rollback: {
        revertedSubtype: t.subtypes.reverted,
        reappliedSubtype: t.subtypes.reapplied,
        appendOnly: t.rollbackPolicy.historyIsAppendOnly,
        classes: t.rollbackPolicy.classes,
        automaticRevertRequires: t.rollbackPolicy.automaticRevertRequires,
        wholeDatabaseRollbackRule: t.rollbackPolicy.wholeDatabaseRollbackForSingleKernelUpdate
      }
    };
  }
  fail(`unsupported transcript plan mode ${mode}`);
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
  const applied = new Map(databaseState.appliedMigrations.map((migration) =>
    typeof migration === 'string' ? [migration, null] : [migration.id, migration.contentHash ?? null]
  ));
  const migrationIntegrityErrors = requiredMigrations.filter((migration) =>
    applied.has(migration.id) && applied.get(migration.id) !== null && applied.get(migration.id) !== migration.contentHash
  );
  const pendingMigrations = requiredMigrations.filter((migration) => !applied.has(migration.id));
  const schemaMatches = manifest.database.requiredSchemaVersion === null ||
    databaseState.databaseSchemaVersion === manifest.database.requiredSchemaVersion;

  const base = {
    schemaVersion: 'SETKA_KERNEL_HANDSHAKE_RESULT_V2',
    releaseId: manifest.releaseId,
    dbRelevantSourceBaselineCommit: manifest.dbRelevantSourceBaselineCommit,
    automaticMigrationEligible: false,
    componentDelta,
    pendingMigrations: pendingMigrations.map((migration) => ({ id: migration.id, contentHash: migration.contentHash })),
    blockedGates,
    migrationIntegrityErrors: migrationIntegrityErrors.map((migration) => migration.id),
    databaseSchemaMatches: schemaMatches,
    actions: []
  };

  if (blockedGates.length) {
    return {
      ...base,
      state: 'BLOCKED_BY_RECOVERY_GATES',
      actions: ['READ_ONLY_ONLY'],
      transcriptPlan: transcriptPlan(manifest, 'NONE', { reason: 'NO_STATE_CHANGE_RECOVERY_BLOCK' })
    };
  }

  if (migrationIntegrityErrors.length) {
    return {
      ...base,
      state: 'MANUAL_REVIEW_REQUIRED',
      actions: ['MIGRATION_HASH_MISMATCH', 'DO_NOT_AUTO_WRITE'],
      transcriptPlan: transcriptPlan(manifest, 'REVIEW_SIGNAL_IF_NEW', { reason: 'MIGRATION_HASH_MISMATCH' })
    };
  }

  const unknownComponentDelta = componentDelta.filter((item) => item.state !== 'MATCH');
  if (unknownComponentDelta.length) {
    return {
      ...base,
      state: 'MANUAL_REVIEW_REQUIRED',
      actions: ['COMPARE_LIVE_STATE', 'DO_NOT_AUTO_WRITE'],
      transcriptPlan: transcriptPlan(manifest, 'REVIEW_SIGNAL_IF_NEW', { reason: 'UNKNOWN_COMPONENT_DRIFT' })
    };
  }

  if (pendingMigrations.length) {
    return {
      ...base,
      state: 'KNOWN_DELTA_READY',
      automaticMigrationEligible: true,
      actions: pendingMigrations.map((migration) => `APPLY_EXACT_ALLOWLISTED_MIGRATION:${migration.id}:${migration.contentHash}`),
      transcriptPlan: transcriptPlan(manifest, 'STATE_CHANGE_PAIR_ON_EXECUTION')
    };
  }

  if (!schemaMatches) {
    return {
      ...base,
      state: 'MANUAL_REVIEW_REQUIRED',
      actions: ['DATABASE_SCHEMA_REVIEW', 'DO_NOT_AUTO_WRITE'],
      transcriptPlan: transcriptPlan(manifest, 'REVIEW_SIGNAL_IF_NEW', { reason: 'DATABASE_SCHEMA_MISMATCH' })
    };
  }

  return {
    ...base,
    state: 'SYNCED_NOOP',
    actions: ['NOOP'],
    transcriptPlan: transcriptPlan(manifest, 'NONE', { reason: 'SYNCED_NOOP_CAUSAL_SILENCE' })
  };
}

function runSelfTest() {
  const manifest = JSON.parse(readFileSync('ops/SETKA_KERNEL_RELEASE_MANIFEST.json', 'utf8'));
  const matchingComponents = Object.fromEntries(Object.entries(manifest.components).map(([name, v]) => [name, { fingerprint: v.fingerprint }]));
  const gates = Object.fromEntries((manifest.recoveryGates ?? []).map((gate) => [gate, true]));
  const baseState = {
    schemaVersion: 'SETKA_DB_KERNEL_STATE_V1',
    gates,
    components: matchingComponents,
    databaseSchemaVersion: manifest.database.requiredSchemaVersion,
    appliedMigrations: []
  };

  const noop = reconcileKernel(manifest, baseState);
  strictEqual(noop.state, 'SYNCED_NOOP');
  strictEqual(noop.transcriptPlan.canonicalWriteRequiredNow, false);
  strictEqual(noop.transcriptPlan.mode, 'NONE');

  const driftState = structuredClone(baseState);
  driftState.components.storage_write.fingerprint = '0'.repeat(64);
  const drift = reconcileKernel(manifest, driftState);
  strictEqual(drift.state, 'MANUAL_REVIEW_REQUIRED');
  strictEqual(drift.transcriptPlan.mode, 'REVIEW_SIGNAL_IF_NEW');

  const blockedState = structuredClone(baseState);
  blockedState.gates.fullBackupComplete = false;
  const blocked = reconcileKernel(manifest, blockedState);
  strictEqual(blocked.state, 'BLOCKED_BY_RECOVERY_GATES');
  strictEqual(blocked.transcriptPlan.mode, 'NONE');

  const migrationManifest = structuredClone(manifest);
  migrationManifest.database.requiredMigrations = [{
    id: 'M_TEST_001',
    contentHash: '1'.repeat(64),
    autoApplyAllowed: true,
    idempotent: true
  }];
  const migrationResult = reconcileKernel(migrationManifest, baseState);
  strictEqual(migrationResult.state, 'KNOWN_DELTA_READY');
  strictEqual(migrationResult.automaticMigrationEligible, true);
  deepStrictEqual(migrationResult.actions, [`APPLY_EXACT_ALLOWLISTED_MIGRATION:M_TEST_001:${'1'.repeat(64)}`]);
  strictEqual(migrationResult.transcriptPlan.mode, 'STATE_CHANGE_PAIR_ON_EXECUTION');
  strictEqual(migrationResult.transcriptPlan.onExecution.startedSubtype, 'KERNEL_RECONCILIATION_STARTED');
  strictEqual(migrationResult.transcriptPlan.onExecution.completedSubtype, 'KERNEL_RECONCILIATION_COMPLETED');
  strictEqual(migrationResult.transcriptPlan.onExecution.completionBoundary, 'TRANSCRIPT_COMPLETED_EVENT_READ_BACK');
  deepStrictEqual(migrationResult.transcriptPlan.rollback.classes, ['REVERSIBLE', 'FORWARD_FIX_ONLY', 'IRREVERSIBLE']);

  const badAppliedState = structuredClone(baseState);
  badAppliedState.appliedMigrations = [{ id: 'M_TEST_001', contentHash: '2'.repeat(64) }];
  const badApplied = reconcileKernel(migrationManifest, badAppliedState);
  strictEqual(badApplied.state, 'MANUAL_REVIEW_REQUIRED');
  strictEqual(badApplied.transcriptPlan.reason, 'MIGRATION_HASH_MISMATCH');

  const unsafeManifest = structuredClone(manifest);
  unsafeManifest.transcriptIntegration.noopCanonicalWrite = true;
  throws(() => reconcileKernel(unsafeManifest, baseState), /causal silence/);

  const rewriteManifest = structuredClone(manifest);
  rewriteManifest.transcriptIntegration.rollbackPolicy.revertCreatesNewEvent = false;
  throws(() => reconcileKernel(rewriteManifest, baseState), /append-only new history/);

  console.log(JSON.stringify({
    schemaVersion: 'SETKA_KERNEL_HANDSHAKE_SELFTEST_V2',
    state: 'PASS',
    cases: 8,
    guarantees: [
      'NOOP_DOES_NOT_WRITE_CANON',
      'STATE_CHANGE_HAS_STARTED_COMPLETED_FAILED_PLAN',
      'COMPLETION_REQUIRES_TRANSCRIPT_READBACK',
      'REVERT_REAPPLY_ARE_APPEND_ONLY_NEW_EVENTS'
    ]
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
