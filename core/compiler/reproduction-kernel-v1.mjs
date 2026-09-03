import {
  compileRegenerativeKernel,
  loadRegenerativeKernel
} from './regeneration-kernel-v1.mjs';
import { validateMachineKernelSelfKnowledge } from './ship-kernel-compiler.mjs';

export const REPRODUCTIVE_KERNEL_SCHEMA_VERSION = 'SETKA_REPRODUCTIVE_KERNEL_V1';
export const MITOSIS_PLAN_SCHEMA_VERSION = 'SETKA_MITOSIS_PLAN_V1';
export const INHERITANCE_SCHEMA_VERSION = 'SETKA_INHERITANCE_V1';
export const DIFFERENTIATION_SCHEMA_VERSION = 'SETKA_DIFFERENTIATION_V1';

const REPRODUCTIVE_EXTENSION = Object.freeze({
  schemaVersion: 'SETKA_REPRODUCTIVE_EXTENSION_V1',
  purpose: 'ADD_REGULATED_DAUGHTER_CREATION_WITH_NEW_IDENTITY_VERSIONED_GENOTYPE_INHERITANCE_EPIGENETIC_DIFFERENTIATION_AND_DEVELOPMENTAL_CHECKPOINTS_WITHOUT_COPYING_PARENT_CAUSAL_HISTORY_OR_SELF_AUTHORIZING_NEW_KERNEL_LAWS',
  lawRegistry: {
    REGULATED_MITOSIS: {
      role: 'DAUGHTER_IDENTITY_AND_LINEAGE_CREATION',
      formula: 'DAUGHTER=NEW_IDENTITY+PARENT_LINEAGE_REF+GENOTYPE_VERSION_REF+DECLARED_INHERITANCE+NEW_CAUSAL_GENESIS',
      rule: 'MITOSIS_MUST_CREATE_A_DISTINCT_IDENTITY_AND_NEW_CAUSAL_GENESIS; PARENT_CAUSAL_HISTORY_IS_REFERENCED_AS_PROVENANCE_NOT_COPIED_AS_DAUGHTER_LIFE'
    },
    VERSIONED_INHERITANCE: {
      role: 'GENOTYPE_AND_STATE_INHERITANCE_BOUNDARY',
      formula: 'INHERITED=GENOTYPE_REF+ALLOWED_GENES+DECLARED_SEED_STATE+LINEAGE_PROVENANCE; FORBIDDEN=PARENT_PRIVATE_OR_IRREVERSIBLE_LIFE_UNLESS_EXPLICITLY_DECLARED_AND_ALLOWED',
      rule: 'DAUGHTERS_INHERIT_VERSIONED_LAWS_AND_EXPLICITLY_ALLOWED_SEED_STATE_NOT_THE_PARENT_FULL_RUNTIME_OR_CAUSAL_TRANSCRIPT'
    },
    EPIGENETIC_DIFFERENTIATION: {
      role: 'PHENOTYPE_SPECIALIZATION_WITHOUT_GENOME_REWRITE',
      formula: 'PHENOTYPE=EXPRESS(GENOTYPE,EPIGENETIC_MASK,LOCAL_PARAMETERS,IRREVERSIBLE_INPUTS)',
      rule: 'SPECIALIZATION_CHANGES_EXPRESSION_AND_PARAMETERS; FUNDAMENTAL_GENOTYPE_CHANGE_REMAINS_A_SEPARATE_AUTHORIZED_KERNEL_LAW_TRANSITION'
    },
    DEVELOPMENTAL_CHECKPOINTS: {
      role: 'STAGED_SAFE_MATURATION',
      formula: 'ADVANCE(stage_i->stage_i+1)=CHECKPOINT_i_VERIFIED&&INVARIANTS&&VIABILITY&&BARRIER&&RESOURCE_HOMEOSTASIS',
      rule: 'A_DAUGHTER_MAY_NOT_SKIP_REQUIRED_DEVELOPMENTAL_CHECKPOINTS_OR_RECEIVE_PRODUCTION_PRIVILEGES_BEFORE_DECLARED_MATURATION_GATES_PASS'
    }
  },
  capabilityRegistry: {
    REGULATED_REPRODUCTION: ['MITOSIS_PLANNER', 'INHERITANCE_COMPILER', 'DIFFERENTIATION_CONTROLLER'],
    LIVING_ORGANISM_KERNEL: ['MITOSIS_PLANNER', 'INHERITANCE_COMPILER', 'DIFFERENTIATION_CONTROLLER'],
    SELF_HOSTING_KERNEL: ['MITOSIS_PLANNER', 'INHERITANCE_COMPILER', 'DIFFERENTIATION_CONTROLLER']
  },
  organRegistry: {
    MITOSIS_PLANNER: {
      organId: 'MITOSIS_PLANNER',
      version: 'SETKA_REPRODUCTIVE_V1',
      purpose: 'DERIVE_A_DAUGHTER_GENESIS_PLAN_WITH_NEW_IDENTITY_LINEAGE_PROVENANCE_AND_EXPLICIT_GENOTYPE_REFERENCE',
      inputs: ['PARENT_ID', 'DAUGHTER_ID', 'PARENT_GENOTYPE_VERSION', 'LINEAGE_PROVENANCE', 'AUTHORITY_STATE', 'GENESIS_SEED'],
      outputs: ['DAUGHTER_GENESIS_PLAN', 'LINEAGE_RECORD', 'NEW_CAUSAL_GENESIS_REQUIREMENTS'],
      lawReferences: ['REGULATED_MITOSIS', 'VERSIONED_INHERITANCE', 'CAUSAL_IRREDUCIBILITY'],
      dependencies: ['IDENTITY', 'GENOME_STORE', 'NUCLEAR_ENVELOPE', 'PROVENANCE', 'RUNTIME_SAFETY'],
      invariants: ['DAUGHTER_IDENTITY_DISTINCT_FROM_PARENT', 'DAUGHTER_CAUSAL_HISTORY_STARTS_AT_NEW_GENESIS', 'PARENT_HISTORY_REFERENCED_NOT_COPIED', 'GENOTYPE_REFERENCE_VERSIONED'],
      materializationPolicy: 'DERIVE_DAUGHTER_GENESIS_CANDIDATE_ONLY; NO_EXTERNAL_RUNTIME_OR_CANONICAL_DAUGHTER_IS_CREATED_BY_THIS_ORGAN',
      resourceMetrics: ['MITOSIS_PLAN_CPU', 'GENESIS_BYTES', 'LINEAGE_BYTES'],
      provenanceRequirements: ['PARENT_ID_REF', 'GENOTYPE_VERSION_REF', 'AUTHORITY_REF', 'LINEAGE_ROOT'],
      failClosedRules: ['SAME_PARENT_AND_DAUGHTER_ID_BLOCKS_MITOSIS', 'UNKNOWN_GENOTYPE_VERSION_BLOCKS_MITOSIS', 'MISSING_LINEAGE_OR_AUTHORITY_REQUIRES_REVIEW'],
      criticality: 'CRITICAL',
      testBindings: ['REPRODUCTION_KERNEL', 'SHIP_KERNEL_COMPILER', 'MISSION_GATE'],
      reviewTargets: ['DAUGHTER_IDENTITY_AND_GENESIS_BOUNDARY', 'LINEAGE_AND_PARENT_HISTORY_SEPARATION', 'REPRODUCTION_AUTHORITY_BOUNDARY'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/reproduction-kernel-v1.mjs#planMitosis' }
    },
    INHERITANCE_COMPILER: {
      organId: 'INHERITANCE_COMPILER',
      version: 'SETKA_REPRODUCTIVE_V1',
      purpose: 'COMPILE_EXPLICIT_VERSIONED_INHERITANCE_WITH_MINIMUM_SUFFICIENT_DISCLOSURE_AND_NO_IMPLICIT_PARENT_LIFE_COPY',
      inputs: ['GENOTYPE_VERSION', 'ALLOWED_GENE_REFS', 'DECLARED_SEED_STATE', 'DISCLOSURE_CLASS', 'LINEAGE_PROVENANCE'],
      outputs: ['INHERITANCE_MANIFEST', 'FORBIDDEN_IMPLICIT_COPIES'],
      lawReferences: ['VERSIONED_INHERITANCE', 'MINIMUM_SUFFICIENT_DISCLOSURE', 'CAUSAL_IRREDUCIBILITY'],
      dependencies: ['MITOSIS_PLANNER', 'GENOME_STORE', 'MINIMUM_SUFFICIENT_DISCLOSURE', 'CAUSAL_MEMORY', 'PROVENANCE'],
      invariants: ['FULL_PARENT_CAUSAL_HISTORY_NOT_IMPLICITLY_INHERITED', 'PRIVATE_RAW_NOT_UPLINKED_WITHOUT_DECLARED_PERMISSION', 'INHERITED_GENES_REFERENCE_VERSIONED_CONTRACTS'],
      materializationPolicy: 'COMPACT_MANIFEST_ONLY',
      resourceMetrics: ['INHERITANCE_MANIFEST_BYTES', 'INHERITANCE_COMPILE_CPU'],
      provenanceRequirements: ['GENOTYPE_VERSION', 'ALLOWED_GENE_LIST_VERSION', 'DISCLOSURE_DECISION_REF', 'LINEAGE_ROOT'],
      failClosedRules: ['UNKNOWN_DISCLOSURE_CLASS_REQUIRES_REVIEW', 'UNDECLARED_PARENT_STATE_IS_NOT_INHERITED'],
      criticality: 'HIGH',
      testBindings: ['REPRODUCTION_KERNEL', 'SHIP_KERNEL_COMPILER'],
      reviewTargets: ['INHERITANCE_VS_PARENT_LIFE_BOUNDARY', 'PRIVACY_AND_DISCLOSURE_SEMANTICS'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/reproduction-kernel-v1.mjs#compileInheritance' }
    },
    DIFFERENTIATION_CONTROLLER: {
      organId: 'DIFFERENTIATION_CONTROLLER',
      version: 'SETKA_REPRODUCTIVE_V1',
      purpose: 'DERIVE_EPIGENETIC_SPECIALIZATION_AND_STAGED_DEVELOPMENT_WITHOUT_REWRITING_THE_SHARED_GENOTYPE',
      inputs: ['GENOTYPE_VERSION', 'EPIGENETIC_MASK', 'LOCAL_PARAMETERS', 'DEVELOPMENTAL_STAGES', 'CHECKPOINT_EVIDENCE', 'SAFE_CONTROL_EVIDENCE', 'HOMEOSTASIS_EVIDENCE'],
      outputs: ['DIFFERENTIATED_EXPRESSION_PLAN', 'CURRENT_DEVELOPMENT_STAGE', 'NEXT_CHECKPOINT_REQUIREMENTS'],
      lawReferences: ['EPIGENETIC_DIFFERENTIATION', 'DEVELOPMENTAL_CHECKPOINTS', 'LYAPUNOV_STABILITY', 'FINITE_VIABILITY_KERNEL'],
      dependencies: ['INHERITANCE_COMPILER', 'EPIGENETIC_ACTIVATION', 'TRANSCRIPTION_EXPRESSION', 'RIBOSOME_ORGAN_FACTORY', 'LYAPUNOV_STABILITY', 'FINITE_VIABILITY_KERNEL', 'CONTROL_BARRIER_FUNCTION', 'HOMEOSTATIC_METABOLISM', 'PROVENANCE'],
      invariants: ['EPIGENETIC_SPECIALIZATION_DOES_NOT_MUTATE_GENOTYPE', 'REQUIRED_DEVELOPMENTAL_CHECKPOINTS_NOT_SKIPPED', 'PRODUCTION_PRIVILEGE_REQUIRES_DECLARED_MATURATION'],
      materializationPolicy: 'DERIVE_EXPRESSION_AND_MATURATION_PLAN_ONLY',
      resourceMetrics: ['DIFFERENTIATION_CPU', 'ACTIVE_ORGAN_COUNT', 'DEVELOPMENT_CHECKPOINT_COUNT'],
      provenanceRequirements: ['GENOTYPE_VERSION', 'EPIGENETIC_MASK_VERSION', 'DEVELOPMENT_STAGE_PROVENANCE', 'CHECKPOINT_PROOF_REFS'],
      failClosedRules: ['UNKNOWN_CHECKPOINT_EVIDENCE_BLOCKS_STAGE_ADVANCE', 'GENOTYPE_MUTATION_REQUEST_ROUTES_TO_EXTERNAL_AUTHORITY_REVIEW'],
      criticality: 'HIGH',
      testBindings: ['REPRODUCTION_KERNEL', 'SHIP_KERNEL_COMPILER', 'STABILITY_VIABILITY'],
      reviewTargets: ['EPIGENETIC_EXPRESSION_VS_GENOTYPE_BOUNDARY', 'DEVELOPMENTAL_STAGE_AND_PRODUCTION_PRIVILEGE_SEMANTICS'],
      buildBinding: { kind: 'MODULE', target: 'core/compiler/reproduction-kernel-v1.mjs#planDifferentiation' }
    }
  },
  reproductivePolicy: {
    loop: ['PARENT_INTENT_OR_AUTHORIZED_REPRODUCTION_SIGNAL', 'MITOSIS_PLAN', 'NEW_DAUGHTER_IDENTITY_AND_CAUSAL_GENESIS', 'VERSIONED_INHERITANCE_MANIFEST', 'EPIGENETIC_DIFFERENTIATION', 'DEVELOPMENTAL_CHECKPOINTS', 'SAFE_CONTROL', 'LEAST_VERIFIED_ACTION', 'AUTHORITY_GATE', 'DAUGHTER_RUNTIME_OR_CANONICAL_COMMIT_BY_EXTERNAL_PATH', 'APPEND_ONLY_LINEAGE_PROVENANCE'],
    hierarchyRule: 'DAUGHTERS_SHARE_VERSIONED_GENOTYPE_REFERENCES_BUT_OWN_DISTINCT_IDENTITY_CAUSAL_LIFE_STATE_AND_PROVENANCE; PARENT_AND_MOTHER_LEVELS_RECEIVE_ONLY_DECLARED_DERIVED_KNOWLEDGE_NOT_RAW_CHILD_LIFE_BY_DEFAULT',
    inheritanceRule: 'INHERIT_LAWS_AND_EXPLICIT_SEED_STATE_BY_REFERENCE; DO_NOT_COPY_FULL_PARENT_RUNTIME_TRANSCRIPT_CACHE_OR_PRIVATE_RAW_LIFE',
    differentiationRule: 'USE_EPIGENETIC_ACTIVATION_AND_LOCAL_PARAMETERS_FOR_SPECIALIZATION_BEFORE_PROPOSING_ANY_GENOTYPE_CHANGE',
    closureRule: 'THE_LIVING_KERNEL_CAN_PLAN_REPRODUCTION_INHERITANCE_AND_DIFFERENTIATION_WHILE_NEW_IDENTITY_EXTERNAL_COMMIT_AUTHORITY_CAUSAL_GENESIS_PRIVACY_AND_KERNEL_LAW_CHANGE_REMAIN_PROTECTED'
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

function mergeReproductiveExtension(baseKernel) {
  const kernel = cloneJson(baseKernel);
  kernel.lawRegistry = { ...kernel.lawRegistry };
  kernel.organRegistry = { ...kernel.organRegistry };
  kernel.capabilityRegistry = { ...kernel.capabilityRegistry };

  for (const [lawId, law] of Object.entries(REPRODUCTIVE_EXTENSION.lawRegistry)) {
    if (Object.hasOwn(kernel.lawRegistry, lawId)) throw new RangeError(`duplicate reproductive law: ${lawId}`);
    kernel.lawRegistry[lawId] = cloneJson(law);
  }
  for (const [organId, contract] of Object.entries(REPRODUCTIVE_EXTENSION.organRegistry)) {
    if (Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`duplicate reproductive organ: ${organId}`);
    kernel.organRegistry[organId] = cloneJson(contract);
  }
  for (const [capability, organIds] of Object.entries(REPRODUCTIVE_EXTENSION.capabilityRegistry)) {
    kernel.capabilityRegistry[capability] = sortedUnique([...(kernel.capabilityRegistry[capability] ?? []), ...organIds]);
  }

  kernel.reproductivePolicy = cloneJson(REPRODUCTIVE_EXTENSION.reproductivePolicy);
  kernel.organismPolicy = {
    ...kernel.organismPolicy,
    loop: Object.freeze([...(kernel.organismPolicy?.loop ?? []), 'REGULATED_REPRODUCTION_WHERE_AUTHORIZED']),
    closureRule: REPRODUCTIVE_EXTENSION.reproductivePolicy.closureRule
  };
  kernel.selfHostingPolicy = {
    ...kernel.selfHostingPolicy,
    loop: Object.freeze([...(kernel.selfHostingPolicy?.loop ?? []), 'REGULATED_REPRODUCTION_WHERE_AUTHORIZED']),
    closureRule: REPRODUCTIVE_EXTENSION.reproductivePolicy.closureRule
  };
  kernel.extensionSources = sortedUnique([...(kernel.extensionSources ?? []), 'core/compiler/reproduction-kernel-v1.mjs#REPRODUCTIVE_EXTENSION']);
  return kernel;
}

export function loadReproductiveKernel() {
  const kernel = mergeReproductiveExtension(loadRegenerativeKernel());
  const check = validateMachineKernelSelfKnowledge({ kernel });
  if (!check.ok) throw new TypeError(`reproductive kernel self-knowledge invalid: ${check.issues.join(', ')}`);
  return Object.freeze(kernel);
}

export function planMitosis({
  parentId,
  daughterId,
  genotypeVersion,
  lineageProvenanceVerified = false,
  authorityValid = false,
  genesisSeedDeclared = false
} = {}) {
  nonEmptyString(parentId, 'parentId');
  nonEmptyString(daughterId, 'daughterId');
  nonEmptyString(genotypeVersion, 'genotypeVersion');
  if (parentId === daughterId) {
    return Object.freeze({ schemaVersion: MITOSIS_PLAN_SCHEMA_VERSION, state: 'BLOCKED_IDENTITY_COLLISION', newIdentityRequired: true, canonicalDaughterCreated: false });
  }
  if (!lineageProvenanceVerified || !authorityValid || !genesisSeedDeclared) {
    return Object.freeze({
      schemaVersion: MITOSIS_PLAN_SCHEMA_VERSION,
      state: authorityValid ? 'REVIEW_REQUIRED' : 'AUTHORITY_REQUIRED',
      reason: !lineageProvenanceVerified ? 'LINEAGE_PROVENANCE_REQUIRED' : (!genesisSeedDeclared ? 'GENESIS_SEED_REQUIRED' : 'EXTERNAL_AUTHORITY_REQUIRED'),
      parentId,
      daughterId,
      genotypeVersion,
      newIdentityRequired: true,
      parentHistoryCopied: false,
      canonicalDaughterCreated: false
    });
  }
  return Object.freeze({
    schemaVersion: MITOSIS_PLAN_SCHEMA_VERSION,
    state: 'DAUGHTER_GENESIS_CANDIDATE_VERIFIED',
    parentId,
    daughterId,
    genotypeVersion,
    newIdentityRequired: true,
    newCausalGenesisRequired: true,
    parentHistoryCopied: false,
    parentHistoryReferenceOnly: true,
    canonicalDaughterCreated: false,
    externalRuntimeCreated: false
  });
}

export function compileInheritance({
  genotypeVersion,
  allowedGeneRefs = [],
  declaredSeedState = {},
  disclosureClass,
  lineageProvenanceVerified = false
} = {}) {
  nonEmptyString(genotypeVersion, 'genotypeVersion');
  nonEmptyString(disclosureClass, 'disclosureClass');
  if (!Array.isArray(allowedGeneRefs)) throw new TypeError('allowedGeneRefs must be an array');
  if (!declaredSeedState || typeof declaredSeedState !== 'object' || Array.isArray(declaredSeedState)) throw new TypeError('declaredSeedState must be an object');
  const allowedDisclosure = new Set(['LOCAL_CAUSAL', 'SHAREABLE_DERIVED', 'GLOBAL_KNOWLEDGE']);
  if (!allowedDisclosure.has(disclosureClass) || !lineageProvenanceVerified) {
    return Object.freeze({
      schemaVersion: INHERITANCE_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: !allowedDisclosure.has(disclosureClass) ? 'DISCLOSURE_CLASS_NOT_ALLOWED_FOR_INHERITANCE' : 'LINEAGE_PROVENANCE_REQUIRED',
      fullParentHistoryInherited: false,
      privateRawInherited: false
    });
  }
  return Object.freeze({
    schemaVersion: INHERITANCE_SCHEMA_VERSION,
    state: 'INHERITANCE_MANIFEST_VERIFIED',
    genotypeVersion,
    allowedGeneRefs: Object.freeze(sortedUnique(allowedGeneRefs.map((x) => nonEmptyString(x, 'allowedGeneRef')))),
    declaredSeedState: Object.freeze(cloneJson(declaredSeedState)),
    disclosureClass,
    fullParentHistoryInherited: false,
    privateRawInherited: false,
    implicitRuntimeStateInherited: false
  });
}

export function planDifferentiation({
  genotypeVersion,
  epigeneticMask = {},
  localParameters = {},
  currentStage,
  nextStage,
  checkpointVerified = false,
  invariantsVerified = false,
  viabilityVerified = false,
  barrierVerified = false,
  homeostasisVerified = false,
  genotypeMutationRequested = false
} = {}) {
  nonEmptyString(genotypeVersion, 'genotypeVersion');
  nonEmptyString(currentStage, 'currentStage');
  nonEmptyString(nextStage, 'nextStage');
  if (genotypeMutationRequested) {
    return Object.freeze({ schemaVersion: DIFFERENTIATION_SCHEMA_VERSION, state: 'EXTERNAL_AUTHORITY_REVIEW_REQUIRED', reason: 'GENOTYPE_MUTATION_IS_NOT_EPIGENETIC_DIFFERENTIATION', genotypeMutationAuthorized: false });
  }
  const ready = checkpointVerified && invariantsVerified && viabilityVerified && barrierVerified && homeostasisVerified;
  return Object.freeze({
    schemaVersion: DIFFERENTIATION_SCHEMA_VERSION,
    state: ready ? 'DEVELOPMENT_STAGE_ADVANCE_CANDIDATE_VERIFIED' : 'DEVELOPMENT_CHECKPOINT_REQUIRED',
    genotypeVersion,
    epigeneticMask: Object.freeze(cloneJson(epigeneticMask)),
    localParameters: Object.freeze(cloneJson(localParameters)),
    currentStage,
    nextStage,
    stageAdvanceReady: ready,
    genotypeMutated: false,
    genotypeMutationAuthorized: false,
    productionPrivilegeGranted: false
  });
}

export function compileReproductiveKernel(intent, { laneCount = 1, activationMask = null, kernel = loadReproductiveKernel() } = {}) {
  const regenerative = compileRegenerativeKernel(intent, { laneCount, activationMask, kernel });
  if (regenerative.state !== 'REGENERATIVE_LIVING_KERNEL_CANDIDATE_COMPILED') {
    return Object.freeze({ schemaVersion: REPRODUCTIVE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'REGENERATIVE_KERNEL_NOT_COMPILED', regenerative });
  }
  const required = ['MITOSIS_PLANNER', 'INHERITANCE_COMPILER', 'DIFFERENTIATION_CONTROLLER'];
  const ids = new Set(regenerative.immuneKernel.livingKernel.blueprint.organs.map((organ) => organ.organId));
  const missingOrgans = required.filter((organId) => !ids.has(organId));
  if (missingOrgans.length > 0) {
    return Object.freeze({ schemaVersion: REPRODUCTIVE_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'REPRODUCTIVE_ORGANS_MISSING', missingOrgans: Object.freeze(missingOrgans), regenerative });
  }
  return Object.freeze({
    schemaVersion: REPRODUCTIVE_KERNEL_SCHEMA_VERSION,
    state: 'REPRODUCTIVE_LIVING_KERNEL_CANDIDATE_COMPILED',
    regenerativeKernel: regenerative,
    reproductiveOrganIds: Object.freeze(required),
    reproductiveLoop: Object.freeze([...kernel.reproductivePolicy.loop]),
    hierarchyRule: kernel.reproductivePolicy.hierarchyRule,
    selfAcceptanceAllowed: false,
    canonicalDaughterCreationAuthorized: false,
    externalRuntimeCreationAuthorized: false,
    genotypeMutationAuthorized: false
  });
}
