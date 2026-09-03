import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHumanRequest,
  compileShipBlueprint,
  compileSelfDevelopmentProposal,
  loadMachineKernel,
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
});

test('arbitrary human language is preserved for normalization rather than guessed by the kernel', () => {
  const envelope = classifyHumanRequest('Построй исследовательский корабль для ветвления миров');
  assert.equal(envelope.state, 'NEEDS_SEMANTIC_NORMALIZATION');
  assert.equal(envelope.kernelNeedsAIToReadItself, false);
  assert.equal(envelope.arbitraryNaturalLanguageDeterministicallyResolved, false);
});

test('complete normalized intent compiles without AI', () => {
  const compiled = compileShipBlueprint(intent());
  assert.equal(compiled.state, 'COMPILED_CANDIDATE');
  assert.equal(compiled.blueprint.requiresAIToCompile, false);
  assert.equal(compiled.blueprint.canonicalMutationAuthorized, false);
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'IDENTITY'));
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'QUADRATIC_GENERATIVE_GEOMETRY'));
  assert.ok(compiled.blueprint.organs.some((organ) => organ.organId === 'LEAST_VERIFIED_ACTION'));
});

test('unknown capability fails closed instead of being invented', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['UNKNOWN_MAGIC_ENGINE'] }));
  assert.equal(compiled.state, 'REVIEW_REQUIRED');
  assert.equal(compiled.reason, 'UNKNOWN_CAPABILITY');
  assert.deepEqual(compiled.unknownCapabilities, ['UNKNOWN_MAGIC_ENGINE']);
});

test('blueprint references only laws known by the loaded machine kernel', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['GENERATIVE_GEOMETRY', 'ATTRACTOR_ANALYSIS', 'SCALING_ANALYSIS'] }));
  const verification = verifyBlueprintKernelReferences(compiled);
  assert.equal(verification.ok, true);
  assert.equal(verification.state, 'VERIFIED');
  assert.deepEqual(verification.unknownLawReferences, []);
});

test('runtime tuning can be compiled as a bounded self-development proposal without self-acceptance', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'BASIN_BOUNDARY_SENSITIVITY', context: { sectorId: 'ENGINE' } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, true);
  assert.equal(out.proposal.externalAuthorityRequired, false);
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
