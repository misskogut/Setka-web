import {
  compileImmuneKernel,
  loadImmuneKernel
} from './immunity-kernel-v1.mjs';
import { validateMachineKernelSelfKnowledge } from './ship-kernel-compiler.mjs';

export const REGENERATIVE_KERNEL_SCHEMA_VERSION = 'SETKA_REGENERATIVE_KERNEL_V1';
export const REGENERATION_PLAN_SCHEMA_VERSION = 'SETKA_REGENERATION_PLAN_V1';
export const REGENERATION_SWAP_SCHEMA_VERSION = 'SETKA_REGENERATION_SWAP_V1';
export const APOPTOSIS_ASSESSMENT_SCHEMA_VERSION = 'SETKA_APOPTOSIS_ASSESSMENT_V1';

const REGENERATIVE_EXTENSION = Object.freeze({
  schemaVersion: 'SETKA_REGENERATIVE_EXTENSION_V1',
  purpose: 'ADD_VERIFIED_ORGAN_REGENERATION_AND_FAIL_CLOSED_RUNTIME_APOPTOSIS_WITHOUT_REWRITING_IDENTITY_CAUSAL_HISTORY_OR_SELF_AUTHORIZING_KERNEL_LAW_CHANGE',
  lawRegistry: {
    VERIFIED_REGENERATION: {
      role: 'GENOTYPE_DRIVEN_ORGAN_REPLACEMENT',
      formula: 'REGENERATE(o)=QUARANTINE(o)&&GENOTYPE_KNOWN&&EXPRESSION_VALID&&BUILD_BINDING_VERIFIED&&STATE_RESTORE_PROVEN&&SAFE_SWAP_PROVEN',
      rule: 'A_DAMAGED_ORGAN_IS_REBUILT_FROM_VERSIONED_GENOTYPE_AND_VERIFIED_BUILD_BINDINGS_RATHER_THAN_PATCHED_IN_PLACE_WHEN_REGENERATION_EVIDENCE_IS_COMPLETE'
    },
    REGENERATIVE_SWAP: {
      role: 'STATE_CONTINUITY_AND_SAFE_REPLACEMENT',
      formula: 'SWAP_OK=REPLAY_PROOF&&INVARIANTS&&VIABILITY&&BARRIER&&PROVENANCE_CONTINUITY&&NO_ACTIVE_EXTERNAL_EFFECT',
      rule: 'A_REGENERATED_ORGAN_REMAINS_A_CANDIDATE_UNTIL_STATE_RESTORE_AND_SAFE_SWAP_EVIDENCE_ARE_VERIFIED; OLD_ORGAN_HISTORY_IS_NOT_DELETED'
    },
    SAFE_APOPTOSIS: {
      role: 'FAIL_CLOSED_RUNTIME_TERMINATION_CANDIDATE',
      formula: 'APOPTOSIS_READY=VIABILITY_EMPTY&&!REPAIR_PATH&&SAFE_SHUTDOWN_PROVEN&&CAUSAL_CAPSULE_SEALED&&IRREVERSIBLE_HISTORY_PRESERVED&&EXTERNAL_EFFECTS_QUIESCED&&AUTHORITY_VALID',
      rule: 'RUNTIME_TERMINATION_IS_A_LAST_RESORT_AFTER_REGENERATION_OR_REPAIR_IS_UNAVAILABLE_AND_MUST_PRESERVE_IDENTITY_CAUSAL_HISTORY_GENOTYPE_PROVENANCE_AND_RESTARTABILITY_EVIDENCE'
    }
  },
  capabilityRegistry: {
    REGENERATIVE_LIFECYCLE: ['REGENERATION_PLANNER', 'APOPTOSIS_CONTROLLER'],
    LIVING_ORGANISM_KERNEL: ['REGENERATION_PLANNER', 'APOPTOSIS_CONTROLLER'],
    SELF_HOSTING_KERNEL: ['REGENERATION_PLANNER', 'APOPTOSIS_CONTROLLER']
  },
  organRegistry: {
    REGENERATION_PLANNER: {
      organId: 'REGENERATION_PLANNER',
      version: 'SETKA_REGENERATIVE_V1',
      purpose: 'DERIVE_A_CLEAN_ORGAN_REBUILD_AND_SAFE_STATE_RESTORE_PLAN_FROM_VERSIONED_GENOTYPE_AFTER_IMMUNE_QUARANTINE',
      inputs: ['QUARANTINE_STATE', 'GENOTYPE_VERSION', 'EXPRESSION_MANIFEST', 'BUILD_BINDING', 'STATE_CHECKPOINT', 'REPLAY_PROOF', 'SAFE_SWAP_EVIDENCE'],
      outputs: ['REGENERATION_PLAN', 'RESTORE_AND_SWAP_REQUIREMENTS'],
      lawReferences: ['VERIFIED_REGENERATION', 'REGENERATIVE_SWAP', 'GENOTYPE_PHENOTYPE', 'CAUSAL_IRREDUCIBILITY'],
      dependencies: ['QUARANTINE_ENVELOPE', 'GENOME_STORE', 'TRANSCRIPTION_EXPRESSION', 'RIBOSOME_ORGAN_FACTORY', 'REPLAY', 'FINITE_VIABILITY_KERNEL', 'CONTROL_BARRIER_FUNCTION', 'LYAPUNOV_STABILITY', 'PROVENANCE'],
      invariants: ['REGENERATION_DOES_NOT_PATCH_OR_MUTATE_CANONICAL_GENOTYPE', 'OLD_ORGAN_CAUSAL_HISTORY_RETAINED', 'STATE_RESTORE_REQUIRES_REPLAY_PROOF', 'SWAP_REQUIRES_SAFE_CONTROL_EVIDENCE'],
      materializationPolicy: 'DERIVE_REBUILD_PLAN_AND_CANDIDATE_ORGAN_ONLY; VERIFIED_SWAP_IS_A_SEPARATE_GATED_STEP',
      resourceMetrics: ['REGENERATION_CPU', 'REBUILD_BYTES', 'RESTORE_REPLAY_COST', 'REGENERATION_LATENCY'],
      provenanceRequirements: ['GENOTYPE_VERSION', 'ORGAN_CONTRACT_REF', 'QUARANTINE_REASON', 'STATE_CHECKPOINT_HASH', 'REPLAY_PROOF_REF'],
      failClosedRules: ['UNKNOWN_GENOTYPE_OR_BUILD_BINDING_BLOCKS_REGENERATION', 'UNVERIFIED_STATE_RESTORE_BLOCKS_SWAP', 'ACTIVE_EXTERNAL_EFFECT_BLOCKS_SWAP'],
      criticality: 'CRITICAL',
      testBindings: ['REGENERATION_KERNEL', 'SHIP_KERNEL_COMPILER', 'STABILITY_VIABILITY', 'MISSION_GATE'],
      reviewTargets: ['REGENERATION_GENOTYPE_TO_BUILD_BOUNDARY', 'STATE_RESTORE_EXACTNESS', 'SAFE_SWAP_AND_PROVENANCE_CONTINUITY'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/regeneration-kernel-v1.mjs#planRegeneration' }
    },
    APOPTOSIS_CONTROLLER: {
      organId: 'APOPTOSIS_CONTROLLER',
      version: 'SETKA_REGENERATIVE_V1',
      purpose: 'ASSESS_WHETHER_LIVE_RUNTIME_TERMINATION_IS_THE_ONLY_SAFE_REMAINING_PATH_AFTER_REPAIR_AND_REGENERATION_ARE_UNAVAILABLE',
      inputs: ['VIABILITY_EVIDENCE', 'REPAIR_PATH_EVIDENCE', 'SAFE_SHUTDOWN_EVIDENCE', 'CAUSAL_CAPSULE_EVIDENCE', 'IRREVERSIBLE_HISTORY_EVIDENCE', 'EXTERNAL_EFFECT_STATE', 'AUTHORITY_STATE'],
      outputs: ['APOPTOSIS_STATE', 'SURVIVAL_CAPSULE_REQUIREMENTS', 'TERMINATION_PRECONDITIONS'],
      lawReferences: ['SAFE_APOPTOSIS', 'FINITE_VIABILITY_KERNEL', 'CAUSAL_IRREDUCIBILITY'],
      dependencies: ['REGENERATION_PLANNER', 'FINITE_VIABILITY_KERNEL', 'CONTROL_BARRIER_FUNCTION', 'HOMEOSTATIC_METABOLISM', 'CAUSAL_MEMORY', 'REPLAY', 'RUNTIME_SAFETY', 'IDENTITY', 'PROVENANCE'],
      invariants: ['REPAIR_OR_REGENERATION_PRECEDES_APOPTOSIS_WHEN_SAFE_PATH_EXISTS', 'APOPTOSIS_STOPS_LIVE_RUNTIME_NOT_IDENTITY_OR_HISTORY', 'CAUSAL_SURVIVAL_CAPSULE_PRECEDES_TERMINATION', 'NO_SELF_AUTHORIZED_KERNEL_LAW_MUTATION'],
      materializationPolicy: 'DERIVE_TERMINATION_CANDIDATE_ONLY; ACTUAL_RUNTIME_STOP_REQUIRES_EXISTING_EXTERNAL_AUTHORITY_AND_RUNTIME_GATES',
      resourceMetrics: ['APOPTOSIS_ASSESSMENT_CPU', 'SURVIVAL_CAPSULE_BYTES', 'QUIESCE_LATENCY'],
      provenanceRequirements: ['VIABILITY_PROOF_REF', 'REPAIR_SEARCH_PROVENANCE', 'CAUSAL_CAPSULE_ROOT', 'AUTHORITY_DECISION_REF'],
      failClosedRules: ['UNKNOWN_VIABILITY_OR_REPAIR_STATUS_BLOCKS_APOPTOSIS', 'UNSEALED_CAUSAL_CAPSULE_BLOCKS_APOPTOSIS', 'ACTIVE_EXTERNAL_EFFECTS_BLOCK_APOPTOSIS', 'MISSING_AUTHORITY_BLOCKS_APOPTOSIS'],
      criticality: 'CRITICAL',
      testBindings: ['REGENERATION_KERNEL', 'STABILITY_VIABILITY', 'KERNEL_HANDSHAKE', 'MISSION_GATE'],
      reviewTargets: ['APOPTOSIS_LAST_RESORT_SEMANTICS', 'CAUSAL_SURVIVAL_CAPSULE_COMPLETENESS', 'RUNTIME_STOP_VS_IDENTITY_PRESERVATION', 'EXTERNAL_AUTHORITY_BOUNDARY'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/regeneration-kernel-v1.mjs#assessApoptosisCandidate' }
    }
  },
  regenerativePolicy: {
    loop: ['DAMAGE_OR_QUARANTINE_SIGNAL', 'REGENERATION_PATH_SEARCH', 'GENOTYPE_TRANSCRIPTION_TRANSLATION', 'CANDIDATE_ORGAN_BUILD', 'STATE_RESTORE_REPLAY', 'SAFE_SWAP_VERIFY', 'REPAIR_OR_REGENERATION_COMMIT_IF_AUTHORIZED', 'IF_NO_SAFE_FUTURE_THEN_APOPTOSIS_ASSESSMENT', 'CAUSAL_SURVIVAL_CAPSULE', 'EXTERNAL_AUTHORITY_GATE', 'RUNTIME_STOP_CANDIDATE', 'APPEND_ONLY_PROVENANCE'],
    organismLoop: ['GENOTYPE_CONTRACTS', 'EPIGENETIC_ACTIVATION', 'NUCLEAR_TRANSCRIPTION', 'RIBOSOMAL_TRANSLATION', 'CLOCK_AND_INTERRUPT_COORDINATION', 'PROCESSOR_FETCH_DECODE_EXECUTE_VERIFY_WRITEBACK', 'METABOLIC_ACCOUNTING', 'SELF_DIAGNOSTIC_SENSING', 'IMMUNE_SELF_NONSELF_CLASSIFICATION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_REPAIR_OR_AUTOPHAGY', 'REGENERATION_PATH_SEARCH_AND_SAFE_SWAP', 'HOMEOSTATIC_REGULATION', 'SAFE_CONTROL', 'COUNTERFACTUAL_TEST', 'LEAST_VERIFIED_ACTION', 'APOPTOSIS_LAST_RESORT_ASSESSMENT', 'AUTHORITY_GATE', 'VERSIONED_GENOTYPE_UPDATE_OR_RUNTIME_STOP', 'APPEND_ONLY_PROVENANCE'],
    regenerationRule: 'REBUILD_FROM_VERSIONED_GENOTYPE_AND_RESTORE_FROM_PROVEN_STATE_INSTEAD_OF_ACCUMULATING_PATCHES_WHEN_A_SAFE_REGENERATION_PATH_IS_VERIFIED',
    apoptosisRule: 'ONLY_WHEN_DECLARED_VIABILITY_IS_EMPTY_AND_NO_REPAIR_OR_REGENERATION_PATH_EXISTS_MAY_A_SEALED_AUTHORIZED_RUNTIME_STOP_CANDIDATE_BE_PRODUCED',
    closureRule: 'THE_ORGANISM_MAY_RECOGNIZE_DAMAGE_ISOLATE_REBUILD_RESTORE_AND_PROPOSE_LAST_RESORT_RUNTIME_TERMINATION_WHILE_IDENTITY_GENOTYPE_CAUSAL_HISTORY_PROVENANCE_AND_EXTERNAL_AUTHORITY_REMAIN_PROTECTED'
  }
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function mergeRegenerativeExtension(baseKernel) {
  const kernel = cloneJson(baseKernel);
  kernel.lawRegistry = { ...kernel.lawRegistry };
  kernel.organRegistry = { ...kernel.organRegistry };
  kernel.capabilityRegistry = { ...kernel.capabilityRegistry };

  for (const [lawId, law] of Object.entries(REGENERATIVE_EXTENSION.lawRegistry)) {
    if (Object.hasOwn(kernel.lawRegistry, lawId)) throw new RangeError(`duplicate regenerative law: ${lawId}`);
    kernel.lawRegistry[lawId] = cloneJson(law);
  }
  for (const [organId, contract] of Object.entries(REGENERATIVE_EXTENSION.organRegistry)) {
    if (Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`duplicate regenerative organ: ${organId}`);
    kernel.organRegistry[organId] = cloneJson(contract);
  }
  for (const [capability, organIds] of Object.entries(REGENERATIVE_EXTENSION.capabilityRegistry)) {
    kernel.capabilityRegistry[capability] = sortedUnique([...(kernel.capabilityRegistry[capability] ?? []), ...organIds]);
  }

  kernel.regenerativePolicy = cloneJson(REGENERATIVE_EXTENSION.regenerativePolicy);
  kernel.organismPolicy = {
    ...kernel.organismPolicy,
    loop: cloneJson(REGENERATIVE_EXTENSION.regenerativePolicy.organismLoop),
    closureRule: REGENERATIVE_EXTENSION.regenerativePolicy.closureRule
  };
  kernel.selfHostingPolicy = {
    ...kernel.selfHostingPolicy,
    loop: cloneJson(REGENERATIVE_EXTENSION.regenerativePolicy.organismLoop),
    closureRule: REGENERATIVE_EXTENSION.regenerativePolicy.closureRule
  };
  kernel.extensionSources = sortedUnique([...(kernel.extensionSources ?? []), 'core/compiler/regeneration-kernel-v1.mjs#REGENERATIVE_EXTENSION']);
  return kernel;
}

export function loadRegenerativeKernel() {
  const kernel = mergeRegenerativeExtension(loadImmuneKernel());
  const check = validateMachineKernelSelfKnowledge({ kernel });
  if (!check.ok) throw new TypeError(`regenerative kernel self-knowledge invalid: ${check.issues.join(', ')}`);
  return Object.freeze(kernel);
}

export function planRegeneration({
  organId,
  quarantineState,
  genotypeVersionKnown = false,
  expressionManifestValid = false,
  buildBindingVerified = false,
  stateCheckpointVerified = false,
  replayProofVerified = false,
  invariantsVerified = false,
  viabilityVerified = false,
  barrierVerified = false,
  provenanceContinuityVerified = false,
  activeExternalEffectCount = 0
} = {}) {
  nonEmptyString(organId, 'organId');
  if (!Number.isInteger(activeExternalEffectCount) || activeExternalEffectCount < 0) throw new TypeError('activeExternalEffectCount must be an integer >= 0');
  const quarantined = quarantineState === 'QUARANTINE_REQUIRED';
  const rebuildReady = quarantined && genotypeVersionKnown && expressionManifestValid && buildBindingVerified && stateCheckpointVerified && replayProofVerified;
  const safeSwapReady = rebuildReady && invariantsVerified && viabilityVerified && barrierVerified && provenanceContinuityVerified && activeExternalEffectCount === 0;

  let state = 'REVIEW_REQUIRED';
  let reason = 'REGENERATION_EVIDENCE_INCOMPLETE';
  if (!quarantined) {
    state = 'NO_REGENERATION_REQUIRED';
    reason = 'ORGAN_NOT_QUARANTINED';
  } else if (safeSwapReady) {
    state = 'SAFE_SWAP_CANDIDATE_VERIFIED';
    reason = null;
  } else if (rebuildReady) {
    state = 'REBUILT_CANDIDATE_REQUIRES_SAFE_SWAP_EVIDENCE';
    reason = 'SAFE_SWAP_EVIDENCE_INCOMPLETE';
  }

  return Object.freeze({
    schemaVersion: REGENERATION_PLAN_SCHEMA_VERSION,
    state,
    reason,
    organId,
    rebuildReady,
    safeSwapReady,
    oldOrganHistoryDeletionAuthorized: false,
    genotypeMutationAuthorized: false,
    canonicalMutationAuthorized: false,
    externalMaterializationPerformed: false,
    swapPerformed: false
  });
}

export function verifyRegenerativeSwap({
  oldOrganId,
  newOrganId,
  replayProofVerified = false,
  invariantsVerified = false,
  viabilityVerified = false,
  barrierVerified = false,
  provenanceContinuityVerified = false,
  activeExternalEffectCount = 0
} = {}) {
  nonEmptyString(oldOrganId, 'oldOrganId');
  nonEmptyString(newOrganId, 'newOrganId');
  if (!Number.isInteger(activeExternalEffectCount) || activeExternalEffectCount < 0) throw new TypeError('activeExternalEffectCount must be an integer >= 0');
  const verified = replayProofVerified && invariantsVerified && viabilityVerified && barrierVerified && provenanceContinuityVerified && activeExternalEffectCount === 0;
  return Object.freeze({
    schemaVersion: REGENERATION_SWAP_SCHEMA_VERSION,
    state: verified ? 'VERIFIED_SWAP_CANDIDATE' : 'REVIEW_REQUIRED',
    oldOrganId,
    newOrganId,
    verified,
    canonicalSwapAuthorized: false,
    swapPerformed: false,
    oldOrganHistoryDeletionAuthorized: false
  });
}

export function assessApoptosisCandidate({
  runtimeId,
  viabilityKernelEmpty,
  repairOrRegenerationPathAvailable,
  safeShutdownPathVerified = false,
  causalCapsuleSealed = false,
  irreversibleHistoryPreserved = false,
  externalEffectsQuiesced = false,
  authorityValid = false
} = {}) {
  nonEmptyString(runtimeId, 'runtimeId');
  if (typeof viabilityKernelEmpty !== 'boolean') throw new TypeError('viabilityKernelEmpty must be boolean');
  if (typeof repairOrRegenerationPathAvailable !== 'boolean') throw new TypeError('repairOrRegenerationPathAvailable must be boolean');

  let state = 'APOPTOSIS_BLOCKED';
  let reason = 'SAFE_FUTURE_STILL_EXISTS';
  if (!viabilityKernelEmpty) {
    state = 'CONTINUE_SAFE_CONTROL';
  } else if (repairOrRegenerationPathAvailable) {
    state = 'REGENERATION_OR_REPAIR_REQUIRED';
    reason = 'REPAIR_PATH_AVAILABLE';
  } else if (!safeShutdownPathVerified || !causalCapsuleSealed || !irreversibleHistoryPreserved || !externalEffectsQuiesced) {
    state = 'REVIEW_REQUIRED';
    reason = 'SURVIVAL_OR_SHUTDOWN_EVIDENCE_INCOMPLETE';
  } else if (!authorityValid) {
    state = 'AUTHORITY_REQUIRED';
    reason = 'EXTERNAL_AUTHORITY_REQUIRED';
  } else {
    state = 'APOPTOSIS_CANDIDATE_READY';
    reason = null;
  }

  return Object.freeze({
    schemaVersion: APOPTOSIS_ASSESSMENT_SCHEMA_VERSION,
    state,
    reason,
    runtimeId,
    identityPreserved: true,
    genotypePreserved: true,
    irreversibleHistoryPreserved: Boolean(irreversibleHistoryPreserved),
    causalCapsuleSealed: Boolean(causalCapsuleSealed),
    runtimeStopAuthorizedByThisFunction: false,
    runtimeStopPerformed: false,
    canonicalDeletionAuthorized: false,
    historyRewriteAuthorized: false
  });
}

export function compileRegenerativeKernel(intent, { laneCount = 1, activationMask = null, kernel = loadRegenerativeKernel() } = {}) {
  const immune = compileImmuneKernel(intent, { laneCount, activationMask, kernel });
  if (immune.state !== 'IMMUNE_LIVING_KERNEL_CANDIDATE_COMPILED') {
    return Object.freeze({ schemaVersion: REGENERATIVE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'IMMUNE_KERNEL_NOT_COMPILED', immune });
  }
  const required = ['REGENERATION_PLANNER', 'APOPTOSIS_CONTROLLER'];
  const ids = new Set(immune.livingKernel.blueprint.organs.map((organ) => organ.organId));
  const missingOrgans = required.filter((organId) => !ids.has(organId));
  if (missingOrgans.length > 0) {
    return Object.freeze({ schemaVersion: REGENERATIVE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'REGENERATIVE_ORGANS_MISSING', missingOrgans: Object.freeze(missingOrgans), immune });
  }
  return Object.freeze({
    schemaVersion: REGENERATIVE_KERNEL_SCHEMA_VERSION,
    state: 'REGENERATIVE_LIVING_KERNEL_CANDIDATE_COMPILED',
    immuneKernel: immune,
    regenerativeOrganIds: Object.freeze(required),
    regenerativeLoop: Object.freeze([...kernel.regenerativePolicy.loop]),
    selfAcceptanceAllowed: false,
    canonicalMutationAuthorized: false,
    runtimeStopAuthorized: false,
    runtimeStopPerformed: false
  });
}
