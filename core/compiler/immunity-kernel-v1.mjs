import {
  compileLivingKernel,
  loadOrganismKernel
} from './organism-kernel-v1.mjs';
import { validateMachineKernelSelfKnowledge } from './ship-kernel-compiler.mjs';

export const IMMUNE_KERNEL_SCHEMA_VERSION = 'SETKA_IMMUNE_KERNEL_V1';
export const IMMUNE_IDENTITY_SCHEMA_VERSION = 'SETKA_IMMUNE_IDENTITY_V1';
export const IMMUNE_ANOMALY_SCHEMA_VERSION = 'SETKA_IMMUNE_ANOMALY_V1';
export const IMMUNE_QUARANTINE_SCHEMA_VERSION = 'SETKA_IMMUNE_QUARANTINE_V1';
export const AUTOPHAGY_ASSESSMENT_SCHEMA_VERSION = 'SETKA_AUTOPHAGY_ASSESSMENT_V1';

const IMMUNE_EXTENSION = Object.freeze({
  schemaVersion: 'SETKA_IMMUNE_EXTENSION_V1',
  purpose: 'ADD_SELF_NONSELF_RECOGNITION_ANOMALY_TRIAGE_QUARANTINE_AND_SAFE_AUTOPHAGY_WITHOUT_DELETING_IRREDUCIBLE_CANONICAL_INFORMATION_OR_CREATING_A_SECOND_RUNTIME',
  lawRegistry: {
    IMMUNE_SELF_NONSELF: {
      role: 'IDENTITY_PROVENANCE_IMMUNE_RECOGNITION',
      formula: 'SELF(x)=DECLARED_SELF_ID(x)&&PROVENANCE_VERIFIED(x)&&VERSION_ALLOWED(x)&&AUTHORITY_VALID(x); AUTHORIZED_EXTERNAL(x)=EXPLICIT_EXTERNAL(x)&&EXTERNAL_AUTHORIZED(x); OTHERWISE_NONSELF_OR_UNKNOWN',
      rule: 'UNKNOWN_IDENTITY_OR_PROVENANCE_NEVER_RECEIVES_SELF_PRIVILEGES_AND_FAILS_TO_QUARANTINE_OR_REVIEW'
    },
    IMMUNE_ANOMALY_TRIAGE: {
      role: 'NORMALIZED_MULTI_SIGNAL_DAMAGE_SENSOR',
      formula: 'A(x)=max_i(s_i), s_i in [0,1]; A>=theta_q=>QUARANTINE_CANDIDATE; A>=theta_w=>WARNING',
      rule: 'THRESHOLDS_AND_SIGNAL_PROVENANCE_MUST_BE_DECLARED; THE_KERNEL_DOES_NOT_INVENT_MISSING_EVIDENCE'
    },
    QUARANTINE_MEMBRANE: {
      role: 'ISOLATE_UNTRUSTED_OR_DAMAGED_DERIVED_WORK',
      formula: 'Q={x | identity_state in {NONSELF_DECLARED,UNKNOWN_IDENTITY} OR anomaly_state=QUARANTINE_CANDIDATE}',
      rule: 'QUARANTINE_BLOCKS_CANONICAL_WRITEBACK_AND_EXTERNAL_EFFECTS_BUT_DOES_NOT_DELETE_HISTORY_OR_MUTATE_GENOTYPE'
    },
    AUTOPHAGY_ADMISSION: {
      role: 'SAFE_DERIVED_MASS_RECLAMATION',
      formula: 'DISPOSABLE(x)=DERIVED(x)&&RECONSTRUCTION_PROOF_VERIFIED(x)&&!UNIQUE_IRREVERSIBLE_INFORMATION(x)&&ACTIVE_DEPENDENCIES(x)=0&&PROVENANCE_RETAINED(x)',
      rule: 'CANONICAL_CAUSES_UNIQUE_IRREVERSIBLE_INPUTS_UNKNOWN_RECONSTRUCTION_OR_ACTIVE_DEPENDENCIES_ARE_NEVER_AUTOPHAGY_ELIGIBLE'
    }
  },
  capabilityRegistry: {
    IMMUNE_HOMEOSTASIS: ['SELF_NONSELF_RECOGNITION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_ENVELOPE', 'AUTOPHAGY_RECYCLER'],
    LIVING_ORGANISM_KERNEL: ['SELF_NONSELF_RECOGNITION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_ENVELOPE', 'AUTOPHAGY_RECYCLER'],
    SELF_HOSTING_KERNEL: ['SELF_NONSELF_RECOGNITION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_ENVELOPE', 'AUTOPHAGY_RECYCLER']
  },
  organRegistry: {
    SELF_NONSELF_RECOGNITION: {
      organId: 'SELF_NONSELF_RECOGNITION',
      version: 'SETKA_IMMUNE_V1',
      purpose: 'CLASSIFY_DECLARED_SELF_AUTHORIZED_EXTERNAL_NONSELF_AND_UNKNOWN_INPUTS_FROM_IDENTITY_PROVENANCE_VERSION_AND_AUTHORITY_EVIDENCE',
      inputs: ['IDENTITY_ID', 'DECLARED_SELF_IDS', 'PROVENANCE_EVIDENCE', 'VERSION_POLICY', 'AUTHORITY_EVIDENCE', 'EXTERNAL_AUTHORIZATION'],
      outputs: ['IMMUNE_IDENTITY_STATE'],
      lawReferences: ['IMMUNE_SELF_NONSELF'],
      dependencies: ['IDENTITY', 'PROVENANCE', 'RUNTIME_SAFETY', 'NUCLEAR_ENVELOPE'],
      invariants: ['UNKNOWN_NEVER_INHERITS_SELF_PRIVILEGE', 'AUTHORIZED_EXTERNAL_IS_NOT_SILENTLY_RELABELED_AS_SELF'],
      materializationPolicy: 'DERIVE_PER_INGRESS_OR_INTEGRITY_CHECK',
      resourceMetrics: ['IMMUNE_IDENTITY_CHECK_COUNT', 'IMMUNE_IDENTITY_CPU'],
      provenanceRequirements: ['IDENTITY_SOURCE', 'PROVENANCE_CHECK_VERSION', 'AUTHORITY_POLICY_VERSION'],
      failClosedRules: ['UNKNOWN_OR_CONTRADICTORY_EVIDENCE_ROUTES_TO_QUARANTINE_OR_REVIEW'],
      criticality: 'CRITICAL',
      testBindings: ['IMMUNITY_KERNEL', 'SHIP_KERNEL_COMPILER', 'MISSION_GATE'],
      reviewTargets: ['SELF_NONSELF_IDENTITY_BOUNDARY', 'AUTHORITY_AND_PROVENANCE_SEMANTICS'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/immunity-kernel-v1.mjs#classifyImmuneIdentity' }
    },
    IMMUNE_ANOMALY_TRIAGE: {
      organId: 'IMMUNE_ANOMALY_TRIAGE',
      version: 'SETKA_IMMUNE_V1',
      purpose: 'COMBINE_DECLARED_NORMALIZED_INTEGRITY_BEHAVIOR_PROVENANCE_AND_RESOURCE_SIGNALS_INTO_A_FAIL_CLOSED_DAMAGE_TRIAGE',
      inputs: ['NORMALIZED_ANOMALY_SIGNALS', 'WARNING_THRESHOLD', 'QUARANTINE_THRESHOLD'],
      outputs: ['ANOMALY_SCORE', 'ANOMALY_STATE'],
      lawReferences: ['IMMUNE_ANOMALY_TRIAGE', 'SHANNON_NOVELTY'],
      dependencies: ['SELF_DIAGNOSTIC', 'SHANNON_NOVELTY', 'PROVENANCE'],
      invariants: ['SIGNALS_BOUNDED_0_1', 'QUARANTINE_THRESHOLD_GE_WARNING_THRESHOLD'],
      materializationPolicy: 'DERIVE_FROM_CURRENT_SIGNALS',
      resourceMetrics: ['ANOMALY_SIGNAL_COUNT', 'IMMUNE_TRIAGE_CPU'],
      provenanceRequirements: ['SIGNAL_SOURCE', 'SIGNAL_NORMALIZATION_VERSION', 'THRESHOLD_VERSION'],
      failClosedRules: ['NO_SIGNAL_EVIDENCE_REQUIRES_REVIEW', 'OUT_OF_RANGE_SIGNAL_REJECTED'],
      criticality: 'HIGH',
      testBindings: ['IMMUNITY_KERNEL', 'SHIP_KERNEL_COMPILER'],
      reviewTargets: ['ANOMALY_SIGNAL_NORMALIZATION', 'QUARANTINE_THRESHOLD_SEMANTICS'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/immunity-kernel-v1.mjs#scoreImmuneAnomaly' }
    },
    QUARANTINE_ENVELOPE: {
      organId: 'QUARANTINE_ENVELOPE',
      version: 'SETKA_IMMUNE_V1',
      purpose: 'ISOLATE_NONSELF_UNKNOWN_OR_DAMAGED_WORK_BEFORE_CANONICAL_WRITEBACK_OR_EXTERNAL_EFFECT',
      inputs: ['IMMUNE_IDENTITY_STATE', 'ANOMALY_STATE', 'CANDIDATE_ID'],
      outputs: ['QUARANTINE_PLAN', 'CANONICAL_WRITE_ALLOWED'],
      lawReferences: ['QUARANTINE_MEMBRANE', 'NUCLEAR_MEMBRANE'],
      dependencies: ['SELF_NONSELF_RECOGNITION', 'IMMUNE_ANOMALY_TRIAGE', 'RUNTIME_SAFETY', 'INTERNAL_TYPED_BUS', 'PROVENANCE'],
      invariants: ['QUARANTINE_IS_ISOLATION_NOT_DELETION', 'QUARANTINED_WORK_CANNOT_CANONICAL_WRITEBACK'],
      materializationPolicy: 'EPHEMERAL_ISOLATION_STATE_PLUS_REQUIRED_PROVENANCE',
      resourceMetrics: ['QUARANTINED_OBJECT_COUNT', 'QUARANTINE_BYTES', 'QUARANTINE_DURATION'],
      provenanceRequirements: ['QUARANTINE_REASON', 'SOURCE_IDENTITY_STATE', 'SOURCE_ANOMALY_STATE'],
      failClosedRules: ['UNKNOWN_IMMUNE_STATE_QUARANTINES', 'QUARANTINE_NEVER_REWRITES_HISTORY'],
      criticality: 'CRITICAL',
      testBindings: ['IMMUNITY_KERNEL', 'SHIP_KERNEL_COMPILER', 'MISSION_GATE'],
      reviewTargets: ['QUARANTINE_WRITEBACK_BOUNDARY', 'ISOLATION_VS_DELETION_SEMANTICS'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/immunity-kernel-v1.mjs#planImmuneQuarantine' }
    },
    AUTOPHAGY_RECYCLER: {
      organId: 'AUTOPHAGY_RECYCLER',
      version: 'SETKA_IMMUNE_V1',
      purpose: 'IDENTIFY_DERIVED_RECONSTRUCTIBLE_INACTIVE_MASS_THAT_MAY_BE_RECLAIMED_WITHOUT_LOSING_IRREDUCIBLE_INFORMATION',
      inputs: ['DERIVED_FLAG', 'RECONSTRUCTION_PROOF', 'IRREVERSIBLE_INFORMATION_FLAG', 'ACTIVE_DEPENDENCIES', 'PROVENANCE_RETENTION', 'BYTES', 'RECOMPUTE_COST'],
      outputs: ['AUTOPHAGY_ELIGIBILITY', 'RECLAIMABLE_BYTES', 'RECOVERY_EVIDENCE'],
      lawReferences: ['AUTOPHAGY_ADMISSION', 'CAUSAL_IRREDUCIBILITY', 'COMPUTATIONAL_IRREDUCIBILITY', 'LEAST_VERIFIED_ACTION'],
      dependencies: ['QUARANTINE_ENVELOPE', 'CAUSAL_MEMORY', 'REPLAY', 'DERIVED_CACHE', 'HOMEOSTATIC_METABOLISM', 'LEAST_VERIFIED_ACTION', 'PROVENANCE'],
      invariants: ['UNIQUE_IRREVERSIBLE_INFORMATION_NEVER_DISPOSABLE', 'ACTIVE_DEPENDENCIES_BLOCK_RECLAMATION', 'RECONSTRUCTION_PROOF_REQUIRED'],
      materializationPolicy: 'DERIVE_RECLAMATION_PLAN_ONLY; ACTUAL_CLEANUP_REMAINS_SEPARATE_VERIFIED_ACTION',
      resourceMetrics: ['RECLAIMABLE_BYTES', 'RECOMPUTE_COST', 'AUTOPHAGY_CHECK_CPU'],
      provenanceRequirements: ['RECONSTRUCTION_PROOF_REF', 'DEPENDENCY_SNAPSHOT', 'CAUSAL_CLASSIFICATION'],
      failClosedRules: ['UNKNOWN_CAUSAL_CLASS_OR_RECONSTRUCTION_BLOCKS_AUTOPHAGY', 'CANONICAL_OR_UNIQUE_IRREVERSIBLE_INFORMATION_BLOCKS_AUTOPHAGY'],
      criticality: 'CRITICAL',
      testBindings: ['IMMUNITY_KERNEL', 'RESOURCE_PHYSICS', 'REPLAY_CORE', 'MISSION_GATE'],
      reviewTargets: ['AUTOPHAGY_CAUSAL_BOUNDARY', 'RECONSTRUCTION_PROOF_AND_DEPENDENCY_COMPLETENESS', 'RESOURCE_RECOVERY_VS_RECOMPUTE_COST'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/immunity-kernel-v1.mjs#assessAutophagyCandidate' }
    }
  },
  immunePolicy: {
    loop: ['SELF_NONSELF_RECOGNITION', 'ANOMALY_TRIAGE', 'QUARANTINE_IF_REQUIRED', 'REPAIR_OR_AUTOPHAGY_CANDIDATE', 'SAFE_CONTROL', 'LEAST_VERIFIED_ACTION', 'RESOURCE_RECOVERY', 'PROVENANCE'],
    organismLoop: ['GENOTYPE_CONTRACTS', 'EPIGENETIC_ACTIVATION', 'NUCLEAR_TRANSCRIPTION', 'RIBOSOMAL_TRANSLATION', 'CLOCK_AND_INTERRUPT_COORDINATION', 'PROCESSOR_FETCH_DECODE_EXECUTE_VERIFY_WRITEBACK', 'METABOLIC_ACCOUNTING', 'SELF_DIAGNOSTIC_SENSING', 'IMMUNE_SELF_NONSELF_CLASSIFICATION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_REPAIR_OR_AUTOPHAGY', 'HOMEOSTATIC_REGULATION', 'SAFE_CONTROL', 'COUNTERFACTUAL_TEST', 'LEAST_VERIFIED_ACTION', 'AUTHORITY_GATE', 'VERSIONED_GENOTYPE_UPDATE', 'APPEND_ONLY_PROVENANCE'],
    canonicalMemoryRule: 'IMMUNITY_MAY_ISOLATE_REPAIR_OR_RECLAIM_DERIVED_MASS_BUT_MUST_NEVER_DELETE_UNIQUE_IRREVERSIBLE_CAUSAL_INFORMATION',
    cleanupRule: 'AUTOPHAGY_IS_ADMISSIBLE_ONLY_FOR_VERIFIED_RECONSTRUCTIBLE_DERIVED_MASS_WITH_NO_ACTIVE_DEPENDENCIES_AND_RETAINED_PROVENANCE',
    closureRule: 'THE_LIVING_KERNEL_CAN_RECOGNIZE_TRIAGE_ISOLATE_AND_PROPOSE_SAFE_RECLAMATION_WHILE_CANONICAL_CAUSES_GENOTYPE_AUTHORITY_AND_APPEND_ONLY_HISTORY_REMAIN_PROTECTED'
  }
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function finiteUnitInterval(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be in [0,1]`);
  return value;
}

function finiteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite number >= 0`);
  return value;
}

function mergeImmuneExtension(baseKernel) {
  const kernel = cloneJson(baseKernel);
  kernel.lawRegistry = { ...kernel.lawRegistry };
  kernel.organRegistry = { ...kernel.organRegistry };
  kernel.capabilityRegistry = { ...kernel.capabilityRegistry };

  for (const [lawId, law] of Object.entries(IMMUNE_EXTENSION.lawRegistry)) {
    if (Object.hasOwn(kernel.lawRegistry, lawId)) throw new RangeError(`duplicate immune law: ${lawId}`);
    kernel.lawRegistry[lawId] = cloneJson(law);
  }
  for (const [organId, contract] of Object.entries(IMMUNE_EXTENSION.organRegistry)) {
    if (Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`duplicate immune organ: ${organId}`);
    kernel.organRegistry[organId] = cloneJson(contract);
  }
  for (const [capability, organIds] of Object.entries(IMMUNE_EXTENSION.capabilityRegistry)) {
    kernel.capabilityRegistry[capability] = sortedUnique([...(kernel.capabilityRegistry[capability] ?? []), ...organIds]);
  }

  kernel.immunePolicy = cloneJson(IMMUNE_EXTENSION.immunePolicy);
  kernel.organismPolicy = {
    ...kernel.organismPolicy,
    loop: cloneJson(IMMUNE_EXTENSION.immunePolicy.organismLoop),
    closureRule: IMMUNE_EXTENSION.immunePolicy.closureRule
  };
  kernel.selfHostingPolicy = {
    ...kernel.selfHostingPolicy,
    loop: cloneJson(IMMUNE_EXTENSION.immunePolicy.organismLoop),
    closureRule: IMMUNE_EXTENSION.immunePolicy.closureRule
  };
  kernel.extensionSources = sortedUnique([...(kernel.extensionSources ?? []), 'core/compiler/immunity-kernel-v1.mjs#IMMUNE_EXTENSION']);
  return kernel;
}

export function loadImmuneKernel() {
  const kernel = mergeImmuneExtension(loadOrganismKernel());
  const check = validateMachineKernelSelfKnowledge({ kernel });
  if (!check.ok) throw new TypeError(`immune kernel self-knowledge invalid: ${check.issues.join(', ')}`);
  return Object.freeze(kernel);
}

export function classifyImmuneIdentity({
  identityId,
  declaredSelfIds = [],
  provenanceVerified = false,
  versionAllowed = false,
  authorityValid = false,
  explicitlyExternal = false,
  externalAuthorized = false
} = {}) {
  if (typeof identityId !== 'string' || identityId.length === 0) throw new TypeError('identityId must be a non-empty string');
  if (!Array.isArray(declaredSelfIds)) throw new TypeError('declaredSelfIds must be an array');
  const declaredSelf = declaredSelfIds.includes(identityId);

  let state = 'UNKNOWN_IDENTITY';
  if (declaredSelf && provenanceVerified && versionAllowed && authorityValid) state = 'SELF_VERIFIED';
  else if (explicitlyExternal && externalAuthorized && provenanceVerified && authorityValid) state = 'AUTHORIZED_EXTERNAL';
  else if (explicitlyExternal && !externalAuthorized) state = 'NONSELF_DECLARED';

  return Object.freeze({
    schemaVersion: IMMUNE_IDENTITY_SCHEMA_VERSION,
    state,
    identityId,
    declaredSelf,
    provenanceVerified: Boolean(provenanceVerified),
    versionAllowed: Boolean(versionAllowed),
    authorityValid: Boolean(authorityValid),
    explicitlyExternal: Boolean(explicitlyExternal),
    externalAuthorized: Boolean(externalAuthorized),
    selfPrivilegeGranted: state === 'SELF_VERIFIED',
    quarantineRecommended: state === 'NONSELF_DECLARED' || state === 'UNKNOWN_IDENTITY'
  });
}

export function scoreImmuneAnomaly({ signals, warningThreshold = 0.35, quarantineThreshold = 0.75 } = {}) {
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) throw new TypeError('signals must be an object');
  const entries = Object.entries(signals);
  if (entries.length === 0) {
    return Object.freeze({ schemaVersion: IMMUNE_ANOMALY_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'NO_ANOMALY_SIGNALS', score: null });
  }
  warningThreshold = finiteUnitInterval(warningThreshold, 'warningThreshold');
  quarantineThreshold = finiteUnitInterval(quarantineThreshold, 'quarantineThreshold');
  if (quarantineThreshold < warningThreshold) throw new RangeError('quarantineThreshold must be >= warningThreshold');
  const normalized = Object.fromEntries(entries.map(([name, value]) => [name, finiteUnitInterval(value, `signals.${name}`)]));
  const score = Math.max(...Object.values(normalized));
  const state = score >= quarantineThreshold ? 'QUARANTINE_CANDIDATE' : (score >= warningThreshold ? 'WARNING' : 'CLEAR');
  return Object.freeze({
    schemaVersion: IMMUNE_ANOMALY_SCHEMA_VERSION,
    state,
    score,
    warningThreshold,
    quarantineThreshold,
    signals: Object.freeze(normalized),
    globalDamageProven: false
  });
}

export function planImmuneQuarantine({ candidateId, identityState, anomalyState } = {}) {
  if (typeof candidateId !== 'string' || candidateId.length === 0) throw new TypeError('candidateId must be a non-empty string');
  const identityQuarantine = identityState === 'NONSELF_DECLARED' || identityState === 'UNKNOWN_IDENTITY';
  const anomalyQuarantine = anomalyState === 'QUARANTINE_CANDIDATE' || anomalyState === 'REVIEW_REQUIRED';
  const quarantine = identityQuarantine || anomalyQuarantine;
  return Object.freeze({
    schemaVersion: IMMUNE_QUARANTINE_SCHEMA_VERSION,
    state: quarantine ? 'QUARANTINE_REQUIRED' : 'PASS',
    candidateId,
    reasons: Object.freeze([
      ...(identityQuarantine ? [`IDENTITY:${identityState}`] : []),
      ...(anomalyQuarantine ? [`ANOMALY:${anomalyState}`] : [])
    ]),
    canonicalWriteAllowed: !quarantine,
    externalEffectAllowed: !quarantine,
    deletionAuthorized: false,
    historyRewriteAuthorized: false
  });
}

export function assessAutophagyCandidate({
  itemId,
  derived = false,
  reconstructionProofVerified = false,
  uniqueIrreversibleInformation = false,
  activeDependencyCount = 0,
  provenanceRetained = false,
  bytes = 0,
  recomputeCost = 0
} = {}) {
  if (typeof itemId !== 'string' || itemId.length === 0) throw new TypeError('itemId must be a non-empty string');
  if (!Number.isInteger(activeDependencyCount) || activeDependencyCount < 0) throw new TypeError('activeDependencyCount must be an integer >= 0');
  bytes = finiteNonNegative(bytes, 'bytes');
  recomputeCost = finiteNonNegative(recomputeCost, 'recomputeCost');

  let state = 'ELIGIBLE_DERIVED_MASS';
  let reason = null;
  if (uniqueIrreversibleInformation) {
    state = 'BLOCKED_IRREDUCIBLE_INFORMATION';
    reason = 'UNIQUE_IRREVERSIBLE_INFORMATION';
  } else if (!derived) {
    state = 'BLOCKED_NOT_DERIVED';
    reason = 'NOT_DERIVED_MASS';
  } else if (!reconstructionProofVerified) {
    state = 'BLOCKED_RECONSTRUCTION_UNPROVEN';
    reason = 'RECONSTRUCTION_PROOF_REQUIRED';
  } else if (activeDependencyCount > 0) {
    state = 'DEFER_ACTIVE_DEPENDENCY';
    reason = 'ACTIVE_DEPENDENCIES_PRESENT';
  } else if (!provenanceRetained) {
    state = 'BLOCKED_PROVENANCE_LOSS';
    reason = 'PROVENANCE_MUST_BE_RETAINED';
  }

  const eligible = state === 'ELIGIBLE_DERIVED_MASS';
  return Object.freeze({
    schemaVersion: AUTOPHAGY_ASSESSMENT_SCHEMA_VERSION,
    state,
    reason,
    itemId,
    eligibleForAutophagy: eligible,
    reclaimableBytes: eligible ? bytes : 0,
    recomputeCost,
    recoveryRatioHint: eligible ? bytes / Math.max(1, recomputeCost) : 0,
    leastVerifiedActionRequired: eligible,
    destructiveCleanupPerformed: false,
    canonicalDeletionAuthorized: false,
    provenanceRetained: Boolean(provenanceRetained)
  });
}

export function compileImmuneKernel(intent, { laneCount = 1, activationMask = null, kernel = loadImmuneKernel() } = {}) {
  const living = compileLivingKernel(intent, { laneCount, activationMask, kernel });
  if (living.state !== 'LIVING_KERNEL_CANDIDATE_COMPILED') {
    return Object.freeze({ schemaVersion: IMMUNE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'LIVING_KERNEL_NOT_COMPILED', living });
  }
  const required = ['SELF_NONSELF_RECOGNITION', 'IMMUNE_ANOMALY_TRIAGE', 'QUARANTINE_ENVELOPE', 'AUTOPHAGY_RECYCLER'];
  const ids = new Set(living.blueprint.organs.map((organ) => organ.organId));
  const missingOrgans = required.filter((organId) => !ids.has(organId));
  if (missingOrgans.length > 0) {
    return Object.freeze({ schemaVersion: IMMUNE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'IMMUNE_ORGANS_MISSING', missingOrgans: Object.freeze(missingOrgans), living });
  }
  return Object.freeze({
    schemaVersion: IMMUNE_KERNEL_SCHEMA_VERSION,
    state: 'IMMUNE_LIVING_KERNEL_CANDIDATE_COMPILED',
    livingKernel: living,
    immuneOrganIds: Object.freeze(required),
    immuneLoop: Object.freeze([...kernel.immunePolicy.loop]),
    canonicalMemoryRule: kernel.immunePolicy.canonicalMemoryRule,
    cleanupRule: kernel.immunePolicy.cleanupRule,
    selfAcceptanceAllowed: false,
    canonicalMutationAuthorized: false,
    destructiveAutophagyPerformed: false
  });
}
