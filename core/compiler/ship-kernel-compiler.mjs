import { readFileSync } from 'node:fs';

export const SHIP_INTENT_SCHEMA_VERSION = 'SETKA_SHIP_INTENT_V1';
export const SHIP_BLUEPRINT_SCHEMA_VERSION = 'SETKA_SHIP_BLUEPRINT_V1';
export const DEVELOPMENT_PROPOSAL_SCHEMA_VERSION = 'SETKA_SELF_DEVELOPMENT_PROPOSAL_V1';

const MACHINE_KERNEL_URL = new URL('../../ops/SETKA_MACHINE_KERNEL_V1.json', import.meta.url);

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function loadMachineKernel() {
  const kernel = JSON.parse(readFileSync(MACHINE_KERNEL_URL, 'utf8'));
  if (kernel?.schemaVersion !== 'SETKA_MACHINE_KERNEL_V1') throw new TypeError('unsupported machine kernel version');
  if (!kernel.lawRegistry || !kernel.capabilityRegistry || !kernel.shipCompiler || !kernel.selfDevelopmentPolicy) {
    throw new TypeError('machine kernel is incomplete');
  }
  return Object.freeze(kernel);
}

export function validateShipIntent(intent) {
  if (!intent || intent.schemaVersion !== SHIP_INTENT_SCHEMA_VERSION) throw new TypeError('unsupported ship intent schema');
  assertString(intent.intentId, 'intentId');
  assertString(intent.purpose, 'purpose');
  if (!Array.isArray(intent.requestedCapabilities) || intent.requestedCapabilities.length === 0) {
    throw new TypeError('requestedCapabilities must be a non-empty array');
  }
  for (const capability of intent.requestedCapabilities) assertString(capability, 'requestedCapabilities[]');
  if (!Array.isArray(intent.constraints)) throw new TypeError('constraints must be an array');
  for (const constraint of intent.constraints) {
    assertString(constraint?.constraintId, 'constraint.constraintId');
    if (!['HARD', 'PREFERENCE'].includes(constraint?.kind)) throw new TypeError(`invalid constraint kind: ${constraint?.kind}`);
    if (!('value' in constraint)) throw new TypeError(`constraint ${constraint.constraintId} must contain value`);
  }
  if (intent.parameters != null && (typeof intent.parameters !== 'object' || Array.isArray(intent.parameters))) {
    throw new TypeError('parameters must be an object when provided');
  }
  return true;
}

export function classifyHumanRequest(request) {
  assertString(request, 'request');
  return Object.freeze({
    schemaVersion: 'SETKA_HUMAN_REQUEST_ENVELOPE_V1',
    state: 'NEEDS_SEMANTIC_NORMALIZATION',
    rawRequest: request,
    targetSchemaVersion: SHIP_INTENT_SCHEMA_VERSION,
    kernelNeedsAIToReadItself: false,
    arbitraryNaturalLanguageDeterministicallyResolved: false,
    permittedNormalizers: ['DETERMINISTIC_UI', 'HUMAN', 'AI'],
    rule: 'NORMALIZER_MAY_TRANSLATE_LANGUAGE_BUT_MUST_NOT_INVENT_OR_OVERRIDE_KERNEL_LAWS'
  });
}

function expandCapability(capability, kernel) {
  const expansion = kernel.capabilityRegistry[capability];
  if (!Array.isArray(expansion)) return null;
  return expansion;
}

export function compileShipBlueprint(intent, { kernel = loadMachineKernel() } = {}) {
  validateShipIntent(intent);
  const unknownCapabilities = [];
  const selected = [...kernel.shipCompiler.baseOrgansAlwaysIncluded];

  for (const capability of intent.requestedCapabilities) {
    const expansion = expandCapability(capability, kernel);
    if (!expansion) unknownCapabilities.push(capability);
    else selected.push(capability, ...expansion);
  }

  if (unknownCapabilities.length > 0) {
    return Object.freeze({
      schemaVersion: SHIP_BLUEPRINT_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'UNKNOWN_CAPABILITY',
      intentId: intent.intentId,
      unknownCapabilities: sortedUnique(unknownCapabilities),
      blueprint: null
    });
  }

  const organIds = sortedUnique(selected);
  const lawReferences = sortedUnique(organIds.filter((id) => Object.hasOwn(kernel.lawRegistry, id)));
  const blueprint = {
    schemaVersion: SHIP_BLUEPRINT_SCHEMA_VERSION,
    blueprintId: `BLUEPRINT:${intent.intentId}`,
    sourceIntentId: intent.intentId,
    machineKernelVersion: kernel.schemaVersion,
    purpose: intent.purpose,
    organs: organIds.map((organId) => ({
      organId,
      lawReferences: Object.hasOwn(kernel.lawRegistry, organId) ? [organId] : [],
      source: 'SETKA_MACHINE_KERNEL_V1'
    })),
    lawReferences,
    constraints: cloneJson(intent.constraints),
    parameters: cloneJson(intent.parameters ?? {}),
    buildProtocol: cloneJson(kernel.pipeline.slice(2)),
    materializationPolicy: 'REFERENCE_VERSIONED_KERNEL_LAWS_AND_STORE_ONLY_SHIP_SPECIFIC_PARAMETERS_CAUSES_AND_RESIDUALS',
    requiresAIToCompile: false,
    canonicalMutationAuthorized: false,
    derivedArtifact: true
  };

  return Object.freeze({
    schemaVersion: SHIP_BLUEPRINT_SCHEMA_VERSION,
    state: 'COMPILED_CANDIDATE',
    reason: null,
    intentId: intent.intentId,
    unknownCapabilities: [],
    blueprint: Object.freeze(blueprint)
  });
}

const DEVELOPMENT_SIGNAL_MAP = Object.freeze({
  AI_USED_FOR_DETERMINISTIC_REDISCOVERY: {
    mutationClass: 'KERNEL_RULE_CANDIDATE',
    action: 'COMPILE_REPEAT_REASONING_TO_MACHINE_RULE_CANDIDATE',
    autoApplyClass: null
  },
  BASIN_BOUNDARY_SENSITIVITY: {
    mutationClass: 'RUNTIME_TUNING',
    action: 'INCREASE_LOCAL_COUNTERFACTUAL_RESOLUTION',
    autoApplyClass: 'COUNTERFACTUAL_SAMPLING_DENSITY'
  },
  DEEP_BASIN_STABILITY: {
    mutationClass: 'RUNTIME_TUNING',
    action: 'KEEP_UNRELATED_DERIVED_DETAIL_FOLDED_WITHIN_DECLARED_THRESHOLD',
    autoApplyClass: 'MATERIALIZATION_RESOLUTION'
  },
  SUPERLINEAR_SCALE_RISK: {
    mutationClass: 'ARCHITECTURE_CANDIDATE',
    action: 'REQUIRE_PRE_SCALE_REDESIGN_OR_BENCHMARK',
    autoApplyClass: null
  },
  FULL_RECOMPUTE_WHERE_DELTA_SUFFICES: {
    mutationClass: 'EXECUTION_PLAN',
    action: 'USE_INCREMENTAL_DEPENDENCY_PROPAGATION',
    autoApplyClass: 'LOCAL_EXECUTION_PLAN_SELECTION'
  },
  DENSE_MATERIALIZATION_WHERE_FOLD_SUFFICES: {
    mutationClass: 'RUNTIME_TUNING',
    action: 'FOLD_UNNEEDED_DERIVED_STATE',
    autoApplyClass: 'MATERIALIZATION_RESOLUTION'
  }
});

export function compileSelfDevelopmentProposal({ signal, context = {}, proposalId = null }, { kernel = loadMachineKernel() } = {}) {
  assertString(signal, 'signal');
  const mapping = DEVELOPMENT_SIGNAL_MAP[signal];
  if (!mapping) {
    return Object.freeze({
      schemaVersion: DEVELOPMENT_PROPOSAL_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'UNKNOWN_DEVELOPMENT_SIGNAL',
      signal,
      proposal: null
    });
  }

  const autoApplyAllowed = mapping.autoApplyClass != null
    && kernel.selfDevelopmentPolicy.autoApplyWithinExistingLawEnvelope.includes(mapping.autoApplyClass);
  const proposal = {
    schemaVersion: DEVELOPMENT_PROPOSAL_SCHEMA_VERSION,
    proposalId: proposalId ?? `DEV:${signal}`,
    signal,
    mutationClass: mapping.mutationClass,
    proposedAction: mapping.action,
    context: cloneJson(context),
    requiredProtocol: cloneJson(kernel.selfDevelopmentPolicy.loop),
    counterfactualFirst: true,
    deterministicVerificationRequired: true,
    leastVerifiedActionRequired: true,
    autoApplyWithinExistingLawEnvelope: autoApplyAllowed,
    externalAuthorityRequired: !autoApplyAllowed,
    accepted: false,
    canonicalMutationPerformed: false
  };

  return Object.freeze({
    schemaVersion: DEVELOPMENT_PROPOSAL_SCHEMA_VERSION,
    state: 'CANDIDATE_COMPILED',
    reason: null,
    signal,
    proposal: Object.freeze(proposal)
  });
}

export function verifyBlueprintKernelReferences(compiled, { kernel = loadMachineKernel() } = {}) {
  if (compiled?.state !== 'COMPILED_CANDIDATE' || !compiled.blueprint) {
    return { state: 'REVIEW_REQUIRED', ok: false, reason: 'BLUEPRINT_NOT_COMPILED' };
  }
  const unknownLawReferences = compiled.blueprint.lawReferences.filter((ref) => !Object.hasOwn(kernel.lawRegistry, ref));
  const missingBaseOrgans = kernel.shipCompiler.baseOrgansAlwaysIncluded.filter(
    (required) => !compiled.blueprint.organs.some((organ) => organ.organId === required)
  );
  const ok = unknownLawReferences.length === 0 && missingBaseOrgans.length === 0;
  return Object.freeze({
    state: ok ? 'VERIFIED' : 'REVIEW_REQUIRED',
    ok,
    unknownLawReferences,
    missingBaseOrgans,
    canonicalMutationAuthorized: false
  });
}
