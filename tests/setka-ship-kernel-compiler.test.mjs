import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHumanRequest,
  compileShipBlueprint,
  compileSelfDevelopmentProposal,
  loadMachineKernel,
  validateMachineKernelSelfKnowledge,
  verifyBlueprintKernelReferences
} from '../core/compiler/ship-kernel-compiler.mjs';

function intent(overrides = {}) {
  return {
    schemaVersion: 'SETKA_SHIP_INTENT_V1',
    intentId: overrides.intentId ?? 'INTENT-1',
    purpose: overrides.purpose ?? 'Build a compact counterfactual research ship',
    requestedCapabilities: overrides.requestedCapabilities ?? ['GENERATIVE_GEOMETRY', 'COUNTERFACTUAL', 'OPTIMIZATION'],
    constraints: overrides.constraints ?? [
      { constraintId: 'PRIVACY', kind: 'HARD', value: 'LOCAL_CAUSAL_ONLY' }
    ],
    parameters: overrides.parameters ?? { fleetSize: 1 }
  };
}

test('machine kernel loads as a deterministic machine-readable contract', () => {
  const kernel = loadMachineKernel();
  assert.equal(kernel.schemaVersion, 'SETKA_MACHINE_KERNEL_V1');
  assert.equal(kernel.ingressPolicy.kernelDoesNotRequireAIToReadItself, true);
  assert.equal(kernel.shipCompiler.intentSchemaVersion, 'SETKA_SHIP_INTENT_V1');
  assert.ok(kernel.lawRegistry.ADAPTIVE_EVIDENCE_BUDGET);
  assert.ok(kernel.lawRegistry.LYAPUNOV_STABILITY);
  assert.ok(kernel.lawRegistry.FINITE_VIABILITY_KERNEL);
});

test('every declared ship organ has a complete machine-readable self-knowledge contract', () => {
  const result = validateMachineKernelSelfKnowledge();
  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
  assert.ok(result.organCount >= 20);
});

test('arbitrary human language is preserved for normalization rather than guessed by the kernel', () => {
  const envelope = classifyHumanRequest('Построй исследовательский корабль для ветвления миров');
  assert.equal(envelope.state, 'NEEDS_SEMANTIC_NORMALIZATION');
  assert.equal(envelope.kernelNeedsAIToReadItself, false);
  assert.equal(envelope.arbitraryNaturalLanguageDeterministicallyResolved, false);
});

test('complete normalized intent compiles without AI from organ contracts and dependency closure', () => {
  const compiled = compileShipBlueprint(intent());
  assert.equal(compiled.state, 'COMPILED_CANDIDATE');
  assert.equal(compiled.blueprint.requiresAIToCompile, false);
  assert.equal(compiled.blueprint.canonicalMutationAuthorized, false);
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'IDENTITY'));
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'QUADRATIC_GENERATIVE_GEOMETRY'));
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'LEAST_VERIFIED_ACTION'));
  assert.equal(compiled.blueprint.organs.some((organ) => organ.organId === 'GENERATIVE_GEOMETRY'), false);
  for (const organ of compiled.blueprint.organs) {
    assert.equal(organ.contractRef, `SETKA_MACHINE_KERNEL_V1#organRegistry.${organ.organId}`);
  }
});

test('unknown capability fails closed instead of being invented', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['UNKNOWN_MAGIC_ENGINE'] }));
  assert.equal(compiled.state, 'REVIEW_REQUIRED');
  assert.equal(compiled.reason, 'UNKNOWN_CAPABILITY');
  assert.deepEqual(compiled.unknownCapabilities, ['UNKNOWN_MAGIC_ENGINE']);
});

test('blueprint references only known laws and contains transitive organ dependencies', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['GENERATIVE_GEOMETRY', 'ATTRACTOR_ANALYSIS', 'SCALING_ANALYSIS'] }));
  const verification = verifyBlueprintKernelReferences(compiled);
  assert.equal(verification.ok, true);
  assert.equal(verification.state, 'VERIFIED');
  assert.deepEqual(verification.unknownLawReferences, []);
  assert.deepEqual(verification.missingDependencies, []);
  assert.ok(compiled.blueprint.lawReferences.includes('ADAPTIVE_EVIDENCE_BUDGET'));
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'FOLD_UNFOLD_MATERIALIZATION'));
});

test('SAFE_CONTROL intent compiles Lyapunov and viability organs without AI', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['SAFE_CONTROL'] }));
  assert.equal(compiled.state, 'COMPILED_CANDIDATE');
  const ids = compiled.blueprint.organs.map((organ) => organ.organId);
  assert.ok(ids.includes('LYAPUNOV_STABILITY'));
  assert.ok(ids.includes('FINITE_VIABILITY_KERNEL'));
  assert.ok(ids.includes('RUNTIME_SAFETY'));
  assert.ok(compiled.blueprint.lawReferences.includes('LYAPUNOV_STABILITY'));
  assert.ok(compiled.blueprint.lawReferences.includes('FINITE_VIABILITY_KERNEL'));
  assert.equal(verifyBlueprintKernelReferences(compiled).state, 'VERIFIED');
});

test('runtime tuning can be compiled as a bounded self-development proposal without self-acceptance', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'BASIN_BOUNDARY_SENSITIVITY', context: { sectorId: 'ENGINE' } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, true);
  assert.equal(out.proposal.externalAuthorityRequired, false);
  assert.equal(out.proposal.accepted, false);
  assert.equal(out.proposal.canonicalMutationPerformed, false);
});

test('deep basin stability compiles to bounded folding proposal rather than blind deletion', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'DEEP_BASIN_STABILITY', context: { sectorId: 'HULL-12', criticality: 0.08 } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.proposedAction, 'KEEP_UNRELATED_DERIVED_DETAIL_FOLDED_WITHIN_DECLARED_THRESHOLD');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, true);
  assert.equal(out.proposal.accepted, false);
  assert.equal(out.proposal.canonicalMutationPerformed, false);
});

test('kernel-rule self-development remains externally authorized', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'AI_USED_FOR_DETERMINISTIC_REDISCOVERY' });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, false);
  assert.equal(out.proposal.externalAuthorityRequired, true);
  assert.equal(out.proposal.accepted, false);
});

test('unknown self-development signal fails closed', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'INVENT_A_NEW_LAW_SILENTLY' });
  assert.equal(out.state, 'REVIEW_REQUIRED');
  assert.equal(out.reason, 'UNKNOWN_DEVELOPMENT_SIGNAL');
});
