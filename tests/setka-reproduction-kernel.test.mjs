import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMachineKernelSelfKnowledge } from '../core/compiler/ship-kernel-compiler.mjs';
import {
  loadReproductiveKernel,
  planMitosis,
  compileInheritance,
  planDifferentiation,
  compileReproductiveKernel
} from '../core/compiler/reproduction-kernel-v1.mjs';

function intent(overrides = {}) {
  return {
    schemaVersion: 'SETKA_SHIP_INTENT_V1',
    intentId: overrides.intentId ?? 'REPRO-INTENT-1',
    purpose: overrides.purpose ?? 'Build a living self-hosting ship capable of regulated reproduction and differentiation',
    requestedCapabilities: overrides.requestedCapabilities ?? ['GENERATIVE_GEOMETRY', 'OPTIMIZATION'],
    constraints: overrides.constraints ?? [{ constraintId: 'PRIVACY', kind: 'HARD', value: 'LOCAL_CAUSAL_ONLY' }],
    parameters: overrides.parameters ?? { fleetSize: 1 }
  };
}

test('reproductive kernel extends regenerative living kernel with complete contracts', () => {
  const kernel = loadReproductiveKernel();
  const check = validateMachineKernelSelfKnowledge({ kernel });
  assert.equal(check.ok, true);
  assert.equal(check.state, 'VERIFIED');
  assert.ok(kernel.lawRegistry.REGULATED_MITOSIS);
  assert.ok(kernel.lawRegistry.VERSIONED_INHERITANCE);
  assert.ok(kernel.lawRegistry.EPIGENETIC_DIFFERENTIATION);
  assert.ok(kernel.lawRegistry.DEVELOPMENTAL_CHECKPOINTS);
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('MITOSIS_PLANNER'));
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('INHERITANCE_COMPILER'));
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL.includes('DIFFERENTIATION_CONTROLLER'));
});

test('mitosis requires a distinct daughter identity and never copies parent causal life', () => {
  const collision = planMitosis({
    parentId: 'SHIP-1', daughterId: 'SHIP-1', genotypeVersion: 'KERNEL-V1', lineageProvenanceVerified: true, authorityValid: true, genesisSeedDeclared: true
  });
  assert.equal(collision.state, 'BLOCKED_IDENTITY_COLLISION');
  assert.equal(collision.canonicalDaughterCreated, false);

  const ready = planMitosis({
    parentId: 'SHIP-1', daughterId: 'SHIP-2', genotypeVersion: 'KERNEL-V1', lineageProvenanceVerified: true, authorityValid: true, genesisSeedDeclared: true
  });
  assert.equal(ready.state, 'DAUGHTER_GENESIS_CANDIDATE_VERIFIED');
  assert.equal(ready.newCausalGenesisRequired, true);
  assert.equal(ready.parentHistoryCopied, false);
  assert.equal(ready.parentHistoryReferenceOnly, true);
  assert.equal(ready.canonicalDaughterCreated, false);
});

test('mitosis fails closed without authority or lineage evidence', () => {
  const noAuthority = planMitosis({
    parentId: 'SHIP-1', daughterId: 'SHIP-2', genotypeVersion: 'KERNEL-V1', lineageProvenanceVerified: true, authorityValid: false, genesisSeedDeclared: true
  });
  assert.equal(noAuthority.state, 'AUTHORITY_REQUIRED');

  const noLineage = planMitosis({
    parentId: 'SHIP-1', daughterId: 'SHIP-2', genotypeVersion: 'KERNEL-V1', lineageProvenanceVerified: false, authorityValid: true, genesisSeedDeclared: true
  });
  assert.equal(noLineage.state, 'REVIEW_REQUIRED');
});

test('inheritance carries versioned genotype and declared seed state but not parent raw life', () => {
  const out = compileInheritance({
    genotypeVersion: 'KERNEL-V1',
    allowedGeneRefs: ['ORGAN:A', 'ORGAN:B', 'ORGAN:A'],
    declaredSeedState: { role: 'SCOUT', energy: 1 },
    disclosureClass: 'LOCAL_CAUSAL',
    lineageProvenanceVerified: true
  });
  assert.equal(out.state, 'INHERITANCE_MANIFEST_VERIFIED');
  assert.deepEqual(out.allowedGeneRefs, ['ORGAN:A', 'ORGAN:B']);
  assert.equal(out.fullParentHistoryInherited, false);
  assert.equal(out.privateRawInherited, false);
  assert.equal(out.implicitRuntimeStateInherited, false);
});

test('private raw or unknown inheritance disclosure fails closed', () => {
  const out = compileInheritance({
    genotypeVersion: 'KERNEL-V1',
    allowedGeneRefs: ['ORGAN:A'],
    declaredSeedState: {},
    disclosureClass: 'PRIVATE_RAW',
    lineageProvenanceVerified: true
  });
  assert.equal(out.state, 'REVIEW_REQUIRED');
  assert.equal(out.privateRawInherited, false);
  assert.equal(out.fullParentHistoryInherited, false);
});

test('differentiation changes expression only after developmental safety checkpoint', () => {
  const waiting = planDifferentiation({
    genotypeVersion: 'KERNEL-V1', epigeneticMask: { SCOUT: true }, localParameters: { sensorGain: 2 }, currentStage: 'SEED', nextStage: 'JUVENILE'
  });
  assert.equal(waiting.state, 'DEVELOPMENT_CHECKPOINT_REQUIRED');
  assert.equal(waiting.stageAdvanceReady, false);
  assert.equal(waiting.genotypeMutated, false);

  const ready = planDifferentiation({
    genotypeVersion: 'KERNEL-V1', epigeneticMask: { SCOUT: true }, localParameters: { sensorGain: 2 }, currentStage: 'SEED', nextStage: 'JUVENILE', checkpointVerified: true, invariantsVerified: true, viabilityVerified: true, barrierVerified: true, homeostasisVerified: true
  });
  assert.equal(ready.state, 'DEVELOPMENT_STAGE_ADVANCE_CANDIDATE_VERIFIED');
  assert.equal(ready.stageAdvanceReady, true);
  assert.equal(ready.genotypeMutated, false);
  assert.equal(ready.productionPrivilegeGranted, false);
});

test('genotype mutation request is not disguised as differentiation', () => {
  const out = planDifferentiation({
    genotypeVersion: 'KERNEL-V1', currentStage: 'SEED', nextStage: 'JUVENILE', genotypeMutationRequested: true
  });
  assert.equal(out.state, 'EXTERNAL_AUTHORITY_REVIEW_REQUIRED');
  assert.equal(out.genotypeMutationAuthorized, false);
});

test('reproductive living kernel compiles regulated reproduction without creating a daughter runtime', () => {
  const out = compileReproductiveKernel(intent(), { laneCount: 2 });
  assert.equal(out.state, 'REPRODUCTIVE_LIVING_KERNEL_CANDIDATE_COMPILED');
  const ids = out.regenerativeKernel.immuneKernel.livingKernel.blueprint.organs.map((organ) => organ.organId);
  assert.ok(ids.includes('MITOSIS_PLANNER'));
  assert.ok(ids.includes('INHERITANCE_COMPILER'));
  assert.ok(ids.includes('DIFFERENTIATION_CONTROLLER'));
  assert.ok(out.reproductiveLoop.includes('MITOSIS_PLAN'));
  assert.equal(out.selfAcceptanceAllowed, false);
  assert.equal(out.canonicalDaughterCreationAuthorized, false);
  assert.equal(out.externalRuntimeCreationAuthorized, false);
  assert.equal(out.genotypeMutationAuthorized, false);
});
