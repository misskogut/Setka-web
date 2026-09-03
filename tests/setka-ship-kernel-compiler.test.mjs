import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHumanRequest,
  compileShipBlueprint,
  compileSelfDevelopmentProposal,
  compileProcessorCore,
  compileCellNucleus,
  compileSelfHostingKernel,
  deriveContractDrivenBuildPlan,
  loadMachineKernel,
  validateMachineKernelSelfKnowledge,
  verifyBlueprintKernelReferences,
  shannonSurprisalBits,
  minimumDescriptionLengthBits,
  informationBottleneckObjective,
  rateDistortionObjective,
  graphLaplacianMorphogenesisStep,
  coarseGrainWeightedMean,
  assessCandidateInvariant
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

test('machine kernel loads as a deterministic machine-readable contract with self-host extension', () => {
  const kernel = loadMachineKernel();
  assert.equal(kernel.schemaVersion, 'SETKA_MACHINE_KERNEL_V1');
  assert.equal(kernel.ingressPolicy.kernelDoesNotRequireAIToReadItself, true);
  assert.equal(kernel.shipCompiler.intentSchemaVersion, 'SETKA_SHIP_INTENT_V1');
  assert.ok(kernel.lawRegistry.ADAPTIVE_EVIDENCE_BUDGET);
  assert.ok(kernel.lawRegistry.LYAPUNOV_STABILITY);
  assert.ok(kernel.lawRegistry.FINITE_VIABILITY_KERNEL);
  assert.ok(kernel.lawRegistry.CONTROL_BARRIER_FUNCTION);
  assert.ok(kernel.lawRegistry.PROCESSOR_EXECUTION_CYCLE);
  assert.ok(kernel.lawRegistry.GENOTYPE_PHENOTYPE);
  assert.ok(kernel.lawRegistry.MINIMUM_DESCRIPTION_LENGTH);
  assert.ok(kernel.lawRegistry.GRAPH_LAPLACIAN_MORPHOGENESIS);
  assert.ok(kernel.capabilityRegistry.SELF_HOSTING_KERNEL);
});

test('every declared ship organ has complete contract-driven machine-readable self-knowledge', () => {
  const result = validateMachineKernelSelfKnowledge();
  assert.equal(result.state, 'VERIFIED');
  assert.equal(result.ok, true);
  assert.equal(result.contractDriven, true);
  assert.equal(result.issues.length, 0);
  assert.ok(result.organCount >= 40);
  const kernel = loadMachineKernel();
  for (const contract of Object.values(kernel.organRegistry)) {
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(contract.criticality));
    assert.ok(Array.isArray(contract.testBindings));
    assert.ok(Array.isArray(contract.reviewTargets));
    assert.equal(typeof contract.buildBinding?.kind, 'string');
    assert.equal(typeof contract.buildBinding?.target, 'string');
  }
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

test('contract-driven build plan is derived from organ contracts instead of a second hand-written build table', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['GENERATIVE_GEOMETRY', 'SAFE_CONTROL'] }));
  const plan = deriveContractDrivenBuildPlan(compiled);
  assert.equal(plan.state, 'VERIFIED');
  assert.ok(plan.testBindings.includes('STABILITY_VIABILITY'));
  assert.ok(plan.criticalOrganIds.includes('RUNTIME_SAFETY'));
  assert.ok(plan.organBindings.every((binding) => binding.buildBinding?.target));
});

test('SAFE_CONTROL now includes Lyapunov viability and control-barrier organs without AI', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['SAFE_CONTROL'] }));
  assert.equal(compiled.state, 'COMPILED_CANDIDATE');
  const ids = compiled.blueprint.organs.map((organ) => organ.organId);
  assert.ok(ids.includes('LYAPUNOV_STABILITY'));
  assert.ok(ids.includes('FINITE_VIABILITY_KERNEL'));
  assert.ok(ids.includes('CONTROL_BARRIER_FUNCTION'));
  assert.ok(ids.includes('RUNTIME_SAFETY'));
  assert.ok(compiled.blueprint.lawReferences.includes('CONTROL_BARRIER_FUNCTION'));
  assert.equal(verifyBlueprintKernelReferences(compiled).state, 'VERIFIED');
});

test('PROCESSOR_CORE compiles fetch-decode-dependency-execute-verify-writeback with noncanonical speculation', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['PROCESSOR_CORE'] }));
  const core = compileProcessorCore(compiled, { laneCount: 4 });
  assert.equal(core.state, 'COMPILED');
  assert.deepEqual(core.stages, ['FETCH', 'DECODE', 'DEPENDENCY_CHECK', 'EXECUTE', 'VERIFY', 'WRITEBACK']);
  assert.equal(core.laneCount, 4);
  assert.equal(core.speculativeCanonicalWriteAllowed, false);
  assert.equal(core.canonicalMutationPerformed, false);
});

test('CELL_NUCLEUS compiles genotype epigenetic activation transcription and replication without genome mutation', () => {
  const compiled = compileShipBlueprint(intent({ requestedCapabilities: ['CELL_NUCLEUS', 'PROCESSOR_CORE'] }));
  const nucleus = compileCellNucleus(compiled, { activationMask: ['IDENTITY', 'GENOME_STORE', 'PROCESSOR_CONTROL_UNIT'] });
  assert.equal(nucleus.state, 'COMPILED');
  assert.deepEqual(nucleus.epigeneticActivation, ['GENOME_STORE', 'IDENTITY', 'PROCESSOR_CONTROL_UNIT']);
  assert.equal(nucleus.expressionExecutionOccursOutsideNucleus, true);
  assert.equal(nucleus.genotypeMutationPerformed, false);
  assert.equal(nucleus.expressionManifest.length, 3);
});

test('SELF_HOSTING_KERNEL closes genotype-to-expression-to-processor-to-authority loop without self-acceptance', () => {
  const out = compileSelfHostingKernel(intent({ requestedCapabilities: ['GENERATIVE_GEOMETRY', 'OPTIMIZATION'] }), { laneCount: 2 });
  assert.equal(out.state, 'SELF_HOSTING_CANDIDATE_COMPILED');
  assert.equal(out.processorCore.state, 'COMPILED');
  assert.equal(out.cellNucleus.state, 'COMPILED');
  assert.ok(out.loop.includes('NUCLEAR_TRANSCRIPTION'));
  assert.ok(out.loop.includes('PROCESSOR_FETCH_DECODE_EXECUTE_VERIFY_WRITEBACK'));
  assert.ok(out.loop.includes('AUTHORITY_GATE'));
  assert.equal(out.selfAcceptanceAllowed, false);
  assert.equal(out.canonicalMutationPerformed, false);
});

test('information-efficiency primitives are deterministic scoring functions over declared evidence', () => {
  assert.equal(shannonSurprisalBits(0.25), 2);
  assert.equal(minimumDescriptionLengthBits({ modelBits: 5, parameterBits: 2, residualBits: 3, proofBits: 1 }), 11);
  assert.equal(informationBottleneckObjective({ iXT: 5, iTY: 2, beta: 1.5 }), 2);
  assert.equal(rateDistortionObjective({ rateBits: 10, distortion: 0.5, lambda: 4 }), 12);
});

test('graph Laplacian morphogenesis performs a declared local diffusion step without inventing global stability', () => {
  const next = graphLaplacianMorphogenesisStep({
    state: [1, 0],
    edges: [{ from: 0, to: 1, weight: 1 }],
    reactionDelta: [0, 0],
    diffusion: 0.5,
    dt: 1
  });
  assert.deepEqual(next, [0.5, 0.5]);
});

test('coarse graining and invariant checking remain declared operators rather than universal theorem claims', () => {
  assert.deepEqual(coarseGrainWeightedMean({ values: [1, 3, 10, 14], groups: [[0, 1], [2, 3]] }), [2, 12]);
  const invariant = assessCandidateInvariant({ values: [3, 3 + 1e-13, 3 - 1e-13], tolerance: 1e-12, symmetryEvidence: false });
  assert.equal(invariant.state, 'NUMERICALLY_STABLE_BUT_NOETHER_LINK_UNPROVEN');
  assert.equal(invariant.generalSymbolicNoetherSolverClaimed, false);
  assert.equal(invariant.globalConservationProven, false);
});

test('runtime tuning can be compiled as a bounded self-development proposal without self-acceptance', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'BASIN_BOUNDARY_SENSITIVITY', context: { sectorId: 'ENGINE' } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, true);
  assert.equal(out.proposal.externalAuthorityRequired, false);
  assert.equal(out.proposal.accepted, false);
  assert.equal(out.proposal.canonicalMutationPerformed, false);
});

test('processor cache mismatch compiles to bounded derived-cache invalidation', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'CACHE_IDENTITY_MISMATCH', context: { cacheKey: 'X' } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.proposedAction, 'INVALIDATE_DERIVED_CACHE_AND_RECOMPUTE');
  assert.equal(out.proposal.autoApplyWithinExistingLawEnvelope, true);
  assert.equal(out.proposal.canonicalMutationPerformed, false);
});

test('genome integrity drift never self-accepts a kernel repair', () => {
  const out = compileSelfDevelopmentProposal({ signal: 'GENOME_INTEGRITY_DRIFT', context: { kernelVersion: 'V1' } });
  assert.equal(out.state, 'CANDIDATE_COMPILED');
  assert.equal(out.proposal.externalAuthorityRequired, true);
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
