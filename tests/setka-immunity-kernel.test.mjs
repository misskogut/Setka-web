import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMachineKernelSelfKnowledge } from '../core/compiler/ship-kernel-compiler.mjs';
import {
  loadImmuneKernel,
  classifyImmuneIdentity,
  scoreImmuneAnomaly,
  planImmuneQuarantine,
  assessAutophagyCandidate,
  compileImmuneKernel
} from '../core/compiler/immunity-kernel-v1.mjs';

function intent(overrides = {}) {
  return {
    schemaVersion: 'SETKA_SHIP_INTENT_V1',
    intentId: overrides.intentId ?? 'IMMUNE-INTENT-1',
    purpose: overrides.purpose ?? 'Build a living self-hosting ship with immune self-cleaning',
    requestedCapabilities: overrides.requestedCapabilities ?? ['GENERATIVE_GEOMETRY', 'OPTIMIZATION'],
    constraints: overrides.constraints ?? [{ constraintId: 'PRIVACY', kind: 'HARD', value: 'LOCAL_CAUSAL_ONLY' }],
    parameters: overrides.parameters ?? { fleetSize: 1 }
  };
}

test('immune kernel extends the living kernel with complete machine-readable contracts', () => {
  const kernel = loadImmuneKernel();
  const check = validateMachineKernelSelfKnowledge({ kernel });
  assert.equal(check.state, 'VERIFIED');
  assert.equal(check.ok, true);
  assert.ok(kernel.lawRegistry.IMMUNE_SELF_NONSELF);
  assert.ok(kernel.lawRegistry.IMMUNE_ANOMALY_TRIAGE);
  assert.ok(kernel.lawRegistry.QUARANTINE_MEMBRANE);
  assert.ok(kernel.lawRegistry.AUTOPHAGY_ADMISSION);
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('SELF_NONSELF_RECOGNITION'));
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('AUTOPHAGY_RECYCLER'));
});

test('self recognition requires identity provenance version and authority evidence together', () => {
  const verified = classifyImmuneIdentity({
    identityId: 'SHIP-1',
    declaredSelfIds: ['SHIP-1'],
    provenanceVerified: true,
    versionAllowed: true,
    authorityValid: true
  });
  assert.equal(verified.state, 'SELF_VERIFIED');
  assert.equal(verified.selfPrivilegeGranted, true);
  assert.equal(verified.quarantineRecommended, false);

  const uncertain = classifyImmuneIdentity({
    identityId: 'SHIP-1',
    declaredSelfIds: ['SHIP-1'],
    provenanceVerified: false,
    versionAllowed: true,
    authorityValid: true
  });
  assert.equal(uncertain.state, 'UNKNOWN_IDENTITY');
  assert.equal(uncertain.selfPrivilegeGranted, false);
  assert.equal(uncertain.quarantineRecommended, true);
});

test('authorized external input is not silently relabeled as self and unauthorized external is nonself', () => {
  const authorized = classifyImmuneIdentity({
    identityId: 'CONNECTOR-X',
    explicitlyExternal: true,
    externalAuthorized: true,
    provenanceVerified: true,
    authorityValid: true
  });
  assert.equal(authorized.state, 'AUTHORIZED_EXTERNAL');
  assert.equal(authorized.selfPrivilegeGranted, false);
  assert.equal(authorized.quarantineRecommended, false);

  const nonself = classifyImmuneIdentity({
    identityId: 'UNKNOWN-X',
    explicitlyExternal: true,
    externalAuthorized: false
  });
  assert.equal(nonself.state, 'NONSELF_DECLARED');
  assert.equal(nonself.quarantineRecommended, true);
});

test('immune anomaly triage uses declared normalized thresholds and fails closed with no signals', () => {
  const clear = scoreImmuneAnomaly({ signals: { integrity: 0.1, provenance: 0.2 } });
  assert.equal(clear.state, 'CLEAR');
  assert.equal(clear.score, 0.2);

  const warning = scoreImmuneAnomaly({ signals: { integrity: 0.5, provenance: 0.2 } });
  assert.equal(warning.state, 'WARNING');

  const quarantine = scoreImmuneAnomaly({ signals: { integrity: 0.9, provenance: 0.1 } });
  assert.equal(quarantine.state, 'QUARANTINE_CANDIDATE');

  const absent = scoreImmuneAnomaly({ signals: {} });
  assert.equal(absent.state, 'REVIEW_REQUIRED');
  assert.equal(absent.reason, 'NO_ANOMALY_SIGNALS');
});

test('quarantine isolates uncertain or damaged work without deleting history', () => {
  const plan = planImmuneQuarantine({
    candidateId: 'CANDIDATE-1',
    identityState: 'SELF_VERIFIED',
    anomalyState: 'QUARANTINE_CANDIDATE'
  });
  assert.equal(plan.state, 'QUARANTINE_REQUIRED');
  assert.equal(plan.canonicalWriteAllowed, false);
  assert.equal(plan.externalEffectAllowed, false);
  assert.equal(plan.deletionAuthorized, false);
  assert.equal(plan.historyRewriteAuthorized, false);
});

test('autophagy admits only reconstructible derived inactive mass with retained provenance', () => {
  const eligible = assessAutophagyCandidate({
    itemId: 'DERIVED-CACHE-1',
    derived: true,
    reconstructionProofVerified: true,
    uniqueIrreversibleInformation: false,
    activeDependencyCount: 0,
    provenanceRetained: true,
    bytes: 4096,
    recomputeCost: 32
  });
  assert.equal(eligible.state, 'ELIGIBLE_DERIVED_MASS');
  assert.equal(eligible.eligibleForAutophagy, true);
  assert.equal(eligible.reclaimableBytes, 4096);
  assert.equal(eligible.leastVerifiedActionRequired, true);
  assert.equal(eligible.destructiveCleanupPerformed, false);

  const canonical = assessAutophagyCandidate({
    itemId: 'IRREVERSIBLE-EVENT-1',
    derived: false,
    reconstructionProofVerified: false,
    uniqueIrreversibleInformation: true,
    activeDependencyCount: 0,
    provenanceRetained: true,
    bytes: 4096,
    recomputeCost: 0
  });
  assert.equal(canonical.state, 'BLOCKED_IRREDUCIBLE_INFORMATION');
  assert.equal(canonical.eligibleForAutophagy, false);
  assert.equal(canonical.reclaimableBytes, 0);
  assert.equal(canonical.canonicalDeletionAuthorized, false);
});

test('immune living kernel compiles the closed recognition quarantine cleanup loop without self-acceptance', () => {
  const out = compileImmuneKernel(intent(), { laneCount: 2 });
  assert.equal(out.state, 'IMMUNE_LIVING_KERNEL_CANDIDATE_COMPILED');
  const ids = out.livingKernel.blueprint.organs.map((organ) => organ.organId);
  assert.ok(ids.includes('SELF_NONSELF_RECOGNITION'));
  assert.ok(ids.includes('IMMUNE_ANOMALY_TRIAGE'));
  assert.ok(ids.includes('QUARANTINE_ENVELOPE'));
  assert.ok(ids.includes('AUTOPHAGY_RECYCLER'));
  assert.ok(out.livingKernel.organismLoop.includes('IMMUNE_SELF_NONSELF_CLASSIFICATION'));
  assert.ok(out.livingKernel.organismLoop.includes('QUARANTINE_REPAIR_OR_AUTOPHAGY'));
  assert.equal(out.selfAcceptanceAllowed, false);
  assert.equal(out.canonicalMutationAuthorized, false);
  assert.equal(out.destructiveAutophagyPerformed, false);
});
