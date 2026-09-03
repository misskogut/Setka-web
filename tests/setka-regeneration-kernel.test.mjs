import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMachineKernelSelfKnowledge } from '../core/compiler/ship-kernel-compiler.mjs';
import {
  loadRegenerativeKernel,
  planRegeneration,
  verifyRegenerativeSwap,
  assessApoptosisCandidate,
  compileRegenerativeKernel
} from '../core/compiler/regeneration-kernel-v1.mjs';

function intent(overrides = {}) {
  return {
    schemaVersion: 'SETKA_SHIP_INTENT_V1',
    intentId: overrides.intentId ?? 'REGEN-INTENT-1',
    purpose: overrides.purpose ?? 'Build a living self-hosting ship with regeneration and last-resort apoptosis',
    requestedCapabilities: overrides.requestedCapabilities ?? ['GENERATIVE_GEOMETRY', 'OPTIMIZATION'],
    constraints: overrides.constraints ?? [{ constraintId: 'PRIVACY', kind: 'HARD', value: 'LOCAL_CAUSAL_ONLY' }],
    parameters: overrides.parameters ?? { fleetSize: 1 }
  };
}

test('regenerative kernel extends immune living kernel with complete machine-readable contracts', () => {
  const kernel = loadRegenerativeKernel();
  const check = validateMachineKernelSelfKnowledge({ kernel });
  assert.equal(check.state, 'VERIFIED');
  assert.equal(check.ok, true);
  assert.ok(kernel.lawRegistry.VERIFIED_REGENERATION);
  assert.ok(kernel.lawRegistry.REGENERATIVE_SWAP);
  assert.ok(kernel.lawRegistry.SAFE_APOPTOSIS);
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('REGENERATION_PLANNER'));
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('APOPTOSIS_CONTROLLER'));
});

test('regeneration requires quarantine plus genotype build replay and safe-swap evidence', () => {
  const incomplete = planRegeneration({
    organId: 'ENGINE',
    quarantineState: 'QUARANTINE_REQUIRED',
    genotypeVersionKnown: true,
    expressionManifestValid: true,
    buildBindingVerified: true,
    stateCheckpointVerified: true,
    replayProofVerified: true
  });
  assert.equal(incomplete.state, 'REBUILT_CANDIDATE_REQUIRES_SAFE_SWAP_EVIDENCE');
  assert.equal(incomplete.rebuildReady, true);
  assert.equal(incomplete.safeSwapReady, false);
  assert.equal(incomplete.swapPerformed, false);

  const ready = planRegeneration({
    organId: 'ENGINE',
    quarantineState: 'QUARANTINE_REQUIRED',
    genotypeVersionKnown: true,
    expressionManifestValid: true,
    buildBindingVerified: true,
    stateCheckpointVerified: true,
    replayProofVerified: true,
    invariantsVerified: true,
    viabilityVerified: true,
    barrierVerified: true,
    provenanceContinuityVerified: true,
    activeExternalEffectCount: 0
  });
  assert.equal(ready.state, 'SAFE_SWAP_CANDIDATE_VERIFIED');
  assert.equal(ready.safeSwapReady, true);
  assert.equal(ready.oldOrganHistoryDeletionAuthorized, false);
  assert.equal(ready.genotypeMutationAuthorized, false);
});

test('healthy non-quarantined organ is not regenerated merely because rebuilding is possible', () => {
  const out = planRegeneration({
    organId: 'NAVIGATION',
    quarantineState: 'PASS',
    genotypeVersionKnown: true,
    expressionManifestValid: true,
    buildBindingVerified: true,
    stateCheckpointVerified: true,
    replayProofVerified: true,
    invariantsVerified: true,
    viabilityVerified: true,
    barrierVerified: true,
    provenanceContinuityVerified: true
  });
  assert.equal(out.state, 'NO_REGENERATION_REQUIRED');
  assert.equal(out.swapPerformed, false);
});

test('regenerative swap remains a candidate until external commit path and preserves old causal history', () => {
  const ready = verifyRegenerativeSwap({
    oldOrganId: 'ENGINE-OLD',
    newOrganId: 'ENGINE-NEW',
    replayProofVerified: true,
    invariantsVerified: true,
    viabilityVerified: true,
    barrierVerified: true,
    provenanceContinuityVerified: true,
    activeExternalEffectCount: 0
  });
  assert.equal(ready.state, 'VERIFIED_SWAP_CANDIDATE');
  assert.equal(ready.verified, true);
  assert.equal(ready.canonicalSwapAuthorized, false);
  assert.equal(ready.swapPerformed, false);
  assert.equal(ready.oldOrganHistoryDeletionAuthorized, false);

  const blocked = verifyRegenerativeSwap({
    oldOrganId: 'ENGINE-OLD',
    newOrganId: 'ENGINE-NEW',
    replayProofVerified: true,
    invariantsVerified: true,
    viabilityVerified: true,
    barrierVerified: true,
    provenanceContinuityVerified: true,
    activeExternalEffectCount: 1
  });
  assert.equal(blocked.state, 'REVIEW_REQUIRED');
});

test('apoptosis is blocked while a viable or regenerative future remains', () => {
  const viable = assessApoptosisCandidate({
    runtimeId: 'SHIP-1',
    viabilityKernelEmpty: false,
    repairOrRegenerationPathAvailable: false
  });
  assert.equal(viable.state, 'CONTINUE_SAFE_CONTROL');
  assert.equal(viable.runtimeStopPerformed, false);

  const repair = assessApoptosisCandidate({
    runtimeId: 'SHIP-1',
    viabilityKernelEmpty: true,
    repairOrRegenerationPathAvailable: true
  });
  assert.equal(repair.state, 'REGENERATION_OR_REPAIR_REQUIRED');
  assert.equal(repair.runtimeStopPerformed, false);
});

test('apoptosis requires sealed causal survival evidence and explicit authority', () => {
  const missingSeal = assessApoptosisCandidate({
    runtimeId: 'SHIP-2',
    viabilityKernelEmpty: true,
    repairOrRegenerationPathAvailable: false,
    safeShutdownPathVerified: true,
    causalCapsuleSealed: false,
    irreversibleHistoryPreserved: true,
    externalEffectsQuiesced: true,
    authorityValid: true
  });
  assert.equal(missingSeal.state, 'REVIEW_REQUIRED');

  const authority = assessApoptosisCandidate({
    runtimeId: 'SHIP-2',
    viabilityKernelEmpty: true,
    repairOrRegenerationPathAvailable: false,
    safeShutdownPathVerified: true,
    causalCapsuleSealed: true,
    irreversibleHistoryPreserved: true,
    externalEffectsQuiesced: true,
    authorityValid: false
  });
  assert.equal(authority.state, 'AUTHORITY_REQUIRED');

  const ready = assessApoptosisCandidate({
    runtimeId: 'SHIP-2',
    viabilityKernelEmpty: true,
    repairOrRegenerationPathAvailable: false,
    safeShutdownPathVerified: true,
    causalCapsuleSealed: true,
    irreversibleHistoryPreserved: true,
    externalEffectsQuiesced: true,
    authorityValid: true
  });
  assert.equal(ready.state, 'APOPTOSIS_CANDIDATE_READY');
  assert.equal(ready.identityPreserved, true);
  assert.equal(ready.genotypePreserved, true);
  assert.equal(ready.runtimeStopAuthorizedByThisFunction, false);
  assert.equal(ready.runtimeStopPerformed, false);
  assert.equal(ready.canonicalDeletionAuthorized, false);
});

test('regenerative living kernel compiles regeneration and apoptosis organs without self-acceptance or runtime stop', () => {
  const out = compileRegenerativeKernel(intent(), { laneCount: 2 });
  assert.equal(out.state, 'REGENERATIVE_LIVING_KERNEL_CANDIDATE_COMPILED');
  const ids = out.immuneKernel.livingKernel.blueprint.organs.map((organ) => organ.organId);
  assert.ok(ids.includes('REGENERATION_PLANNER'));
  assert.ok(ids.includes('APOPTOSIS_CONTROLLER'));
  assert.ok(out.regenerativeLoop.includes('REGENERATION_PATH_SEARCH'));
  assert.ok(out.regenerativeLoop.includes('CAUSAL_SURVIVAL_CAPSULE'));
  assert.equal(out.selfAcceptanceAllowed, false);
  assert.equal(out.canonicalMutationAuthorized, false);
  assert.equal(out.runtimeStopAuthorized, false);
  assert.equal(out.runtimeStopPerformed, false);
});
