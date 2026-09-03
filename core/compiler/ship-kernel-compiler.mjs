import { readFileSync } from 'node:fs';

export const SHIP_INTENT_SCHEMA_VERSION = 'SETKA_SHIP_INTENT_V1';
export const SHIP_BLUEPRINT_SCHEMA_VERSION = 'SETKA_SHIP_BLUEPRINT_V1';
export const DEVELOPMENT_PROPOSAL_SCHEMA_VERSION = 'SETKA_SELF_DEVELOPMENT_PROPOSAL_V1';
export const PROCESSOR_CORE_PLAN_SCHEMA_VERSION = 'SETKA_PROCESSOR_CORE_PLAN_V1';
export const CELL_NUCLEUS_PLAN_SCHEMA_VERSION = 'SETKA_CELL_NUCLEUS_PLAN_V1';
export const SELF_HOSTING_KERNEL_SCHEMA_VERSION = 'SETKA_SELF_HOSTING_KERNEL_V1';

const MACHINE_KERNEL_URL = new URL('../../ops/SETKA_MACHINE_KERNEL_V1.json', import.meta.url);
const SELF_HOST_EXTENSION_URL = new URL('./setka-self-host-extension-v1.json', import.meta.url);

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

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

function finiteNonNegative(value, name) {
  value = finiteNumber(value, name);
  if (value < 0) throw new RangeError(`${name} must be >= 0`);
  return value;
}

function mergeMachineKernel(baseKernel, extension) {
  if (!extension || extension.schemaVersion !== 'SETKA_SELF_HOST_EXTENSION_V1') {
    throw new TypeError('unsupported self-host kernel extension version');
  }

  const kernel = cloneJson(baseKernel);
  kernel.lawRegistry = { ...kernel.lawRegistry };
  kernel.organRegistry = { ...kernel.organRegistry };
  kernel.capabilityRegistry = { ...kernel.capabilityRegistry };

  for (const [lawId, law] of Object.entries(extension.lawRegistry ?? {})) {
    if (Object.hasOwn(kernel.lawRegistry, lawId)) throw new RangeError(`duplicate extension law: ${lawId}`);
    kernel.lawRegistry[lawId] = cloneJson(law);
  }

  for (const [organId, contract] of Object.entries(extension.organRegistry ?? {})) {
    if (Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`duplicate extension organ: ${organId}`);
    kernel.organRegistry[organId] = cloneJson(contract);
  }

  for (const [capability, organIds] of Object.entries(extension.capabilityRegistry ?? {})) {
    if (!Array.isArray(organIds)) throw new TypeError(`extension capability ${capability} must be an array`);
    kernel.capabilityRegistry[capability] = sortedUnique([...(kernel.capabilityRegistry[capability] ?? []), ...organIds]);
  }

  const contractDriven = extension.contractDrivenKernel ?? {};
  const requiredBindingFields = contractDriven.requiredContractFields ?? [];
  kernel.selfKnowledgeContract.requiredForEveryOrgan = sortedUnique([
    ...kernel.selfKnowledgeContract.requiredForEveryOrgan,
    ...requiredBindingFields
  ]);

  for (const [organId, overlay] of Object.entries(contractDriven.organBindingOverlays ?? {})) {
    if (!Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`binding overlay references unknown organ: ${organId}`);
    kernel.organRegistry[organId] = { ...kernel.organRegistry[organId], ...cloneJson(overlay) };
  }

  kernel.contractDrivenKernel = cloneJson(contractDriven);
  kernel.processorCorePolicy = cloneJson(extension.processorCorePolicy);
  kernel.cellNucleusPolicy = cloneJson(extension.cellNucleusPolicy);
  kernel.selfHostingPolicy = cloneJson(extension.selfHostingPolicy);
  kernel.extensionSources = ['core/compiler/setka-self-host-extension-v1.json'];
  return kernel;
}

function inspectMachineKernel(kernel) {
  const issues = [];
  if (!kernel || kernel.schemaVersion !== 'SETKA_MACHINE_KERNEL_V1') {
    return { state: 'INVALID', ok: false, issues: ['UNSUPPORTED_MACHINE_KERNEL_VERSION'] };
  }
  for (const field of ['lawRegistry', 'capabilityRegistry', 'organRegistry', 'shipCompiler', 'selfDevelopmentPolicy', 'selfKnowledgeContract']) {
    if (!kernel[field] || typeof kernel[field] !== 'object') issues.push(`MISSING_${field.toUpperCase()}`);
  }
  if (issues.length > 0) return { state: 'INVALID', ok: false, issues };

  const required = kernel.selfKnowledgeContract.requiredForEveryOrgan;
  if (!Array.isArray(required) || required.length === 0) issues.push('SELF_KNOWLEDGE_REQUIRED_FIELDS_MISSING');
  const organIds = new Set(Object.keys(kernel.organRegistry));
  const lawIds = new Set(Object.keys(kernel.lawRegistry));
  const criticalities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

  for (const [organId, contract] of Object.entries(kernel.organRegistry)) {
    if (!contract || typeof contract !== 'object') {
      issues.push(`ORGAN_CONTRACT_NOT_OBJECT:${organId}`);
      continue;
    }
    for (const field of required ?? []) {
      if (!Object.hasOwn(contract, field)) issues.push(`ORGAN_FIELD_MISSING:${organId}:${field}`);
    }
    if (contract.organId !== organId) issues.push(`ORGAN_ID_MISMATCH:${organId}`);
    for (const field of ['inputs', 'outputs', 'lawReferences', 'dependencies', 'invariants', 'resourceMetrics', 'provenanceRequirements', 'failClosedRules', 'testBindings', 'reviewTargets']) {
      if (!Array.isArray(contract[field])) issues.push(`ORGAN_ARRAY_FIELD_INVALID:${organId}:${field}`);
    }
    if (!criticalities.has(contract.criticality)) issues.push(`ORGAN_CRITICALITY_INVALID:${organId}`);
    if (!contract.buildBinding || typeof contract.buildBinding !== 'object' || Array.isArray(contract.buildBinding)) {
      issues.push(`ORGAN_BUILD_BINDING_INVALID:${organId}`);
    } else {
      if (typeof contract.buildBinding.kind !== 'string' || contract.buildBinding.kind.length === 0) issues.push(`ORGAN_BUILD_BINDING_KIND_INVALID:${organId}`);
      if (typeof contract.buildBinding.target !== 'string' || contract.buildBinding.target.length === 0) issues.push(`ORGAN_BUILD_BINDING_TARGET_INVALID:${organId}`);
    }
    for (const lawRef of contract.lawReferences ?? []) {
      if (!lawIds.has(lawRef)) issues.push(`UNKNOWN_ORGAN_LAW_REFERENCE:${organId}:${lawRef}`);
    }
    for (const dependency of contract.dependencies ?? []) {
      if (!organIds.has(dependency)) issues.push(`UNKNOWN_ORGAN_DEPENDENCY:${organId}:${dependency}`);
    }
  }

  for (const baseOrgan of kernel.shipCompiler.baseOrgansAlwaysIncluded ?? []) {
    if (!organIds.has(baseOrgan)) issues.push(`UNKNOWN_BASE_ORGAN:${baseOrgan}`);
  }
  for (const [capability, expansion] of Object.entries(kernel.capabilityRegistry)) {
    if (!Array.isArray(expansion)) {
      issues.push(`CAPABILITY_EXPANSION_NOT_ARRAY:${capability}`);
      continue;
    }
    for (const organId of expansion) {
      if (!organIds.has(organId)) issues.push(`CAPABILITY_REFERENCES_UNKNOWN_ORGAN:${capability}:${organId}`);
    }
  }

  return {
    schemaVersion: 'SETKA_MACHINE_KERNEL_SELF_KNOWLEDGE_CHECK_V1',
    state: issues.length === 0 ? 'VERIFIED' : 'INVALID',
    ok: issues.length === 0,
    organCount: organIds.size,
    lawCount: lawIds.size,
    capabilityCount: Object.keys(kernel.capabilityRegistry).length,
    contractDriven: Boolean(kernel.contractDrivenKernel),
    issues: Object.freeze(issues.sort())
  };
}

export function loadMachineKernel() {
  const baseKernel = JSON.parse(readFileSync(MACHINE_KERNEL_URL, 'utf8'));
  const extension = JSON.parse(readFileSync(SELF_HOST_EXTENSION_URL, 'utf8'));
  const kernel = mergeMachineKernel(baseKernel, extension);
  const basic = inspectMachineKernel(kernel);
  if (!basic.ok) throw new TypeError(`machine kernel self-knowledge invalid: ${basic.issues.join(', ')}`);
  return Object.freeze(kernel);
}

export function validateMachineKernelSelfKnowledge({ kernel = loadMachineKernel() } = {}) {
  return Object.freeze(inspectMachineKernel(kernel));
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

function resolveOrganClosure(seedOrganIds, kernel) {
  const visiting = new Set();
  const resolved = new Set();

  function visit(organId) {
    if (resolved.has(organId)) return;
    const contract = kernel.organRegistry[organId];
    if (!contract) throw new RangeError(`unknown organ contract: ${organId}`);
    if (visiting.has(organId)) throw new RangeError(`organ dependency cycle: ${organId}`);
    visiting.add(organId);
    for (const dependency of contract.dependencies) visit(dependency);
    visiting.delete(organId);
    resolved.add(organId);
  }

  for (const organId of sortedUnique(seedOrganIds)) visit(organId);
  return [...resolved].sort();
}

export function compileShipBlueprint(intent, { kernel = loadMachineKernel() } = {}) {
  validateShipIntent(intent);
  const selfKnowledge = inspectMachineKernel(kernel);
  if (!selfKnowledge.ok) {
    return Object.freeze({
      schemaVersion: SHIP_BLUEPRINT_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'MACHINE_KERNEL_SELF_KNOWLEDGE_INVALID',
      intentId: intent.intentId,
      unknownCapabilities: [],
      selfKnowledgeIssues: selfKnowledge.issues,
      blueprint: null
    });
  }

  const unknownCapabilities = [];
  const selected = [...kernel.shipCompiler.baseOrgansAlwaysIncluded];
  for (const capability of intent.requestedCapabilities) {
    const expansion = expandCapability(capability, kernel);
    if (!expansion) unknownCapabilities.push(capability);
    else selected.push(...expansion);
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

  const organIds = resolveOrganClosure(selected, kernel);
  const lawReferences = sortedUnique(organIds.flatMap((organId) => kernel.organRegistry[organId].lawReferences));
  const blueprint = {
    schemaVersion: SHIP_BLUEPRINT_SCHEMA_VERSION,
    blueprintId: `BLUEPRINT:${intent.intentId}`,
    sourceIntentId: intent.intentId,
    machineKernelVersion: kernel.schemaVersion,
    purpose: intent.purpose,
    organs: organIds.map((organId) => ({
      organId,
      contractRef: `SETKA_MACHINE_KERNEL_V1#organRegistry.${organId}`,
      lawReferences: cloneJson(kernel.organRegistry[organId].lawReferences),
      source: 'SETKA_MACHINE_KERNEL_V1'
    })),
    lawReferences,
    constraints: cloneJson(intent.constraints),
    parameters: cloneJson(intent.parameters ?? {}),
    buildProtocol: cloneJson(kernel.pipeline.slice(2)),
    materializationPolicy: 'REFERENCE_VERSIONED_KERNEL_LAWS_AND_ORGAN_CONTRACTS_AND_STORE_ONLY_SHIP_SPECIFIC_PARAMETERS_CAUSES_AND_RESIDUALS',
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

export function verifyBlueprintKernelReferences(compiled, { kernel = loadMachineKernel() } = {}) {
  if (compiled?.state !== 'COMPILED_CANDIDATE' || !compiled.blueprint) {
    return { state: 'REVIEW_REQUIRED', ok: false, reason: 'BLUEPRINT_NOT_COMPILED' };
  }
  const selfKnowledge = inspectMachineKernel(kernel);
  if (!selfKnowledge.ok) {
    return { state: 'REVIEW_REQUIRED', ok: false, reason: 'MACHINE_KERNEL_SELF_KNOWLEDGE_INVALID', issues: selfKnowledge.issues };
  }

  const organIds = new Set(compiled.blueprint.organs.map((organ) => organ.organId));
  const unknownOrgans = [...organIds].filter((organId) => !Object.hasOwn(kernel.organRegistry, organId)).sort();
  const unknownLawReferences = compiled.blueprint.lawReferences.filter((ref) => !Object.hasOwn(kernel.lawRegistry, ref));
  const missingBaseOrgans = kernel.shipCompiler.baseOrgansAlwaysIncluded.filter((required) => !organIds.has(required));
  const missingDependencies = [];
  const invalidContractRefs = [];

  for (const organ of compiled.blueprint.organs) {
    const contract = kernel.organRegistry[organ.organId];
    if (!contract) continue;
    if (organ.contractRef !== `SETKA_MACHINE_KERNEL_V1#organRegistry.${organ.organId}`) invalidContractRefs.push(organ.organId);
    for (const dependency of contract.dependencies) {
      if (!organIds.has(dependency)) missingDependencies.push(`${organ.organId}->${dependency}`);
    }
  }

  const ok = unknownOrgans.length === 0
    && unknownLawReferences.length === 0
    && missingBaseOrgans.length === 0
    && missingDependencies.length === 0
    && invalidContractRefs.length === 0;
  return Object.freeze({
    state: ok ? 'VERIFIED' : 'REVIEW_REQUIRED',
    ok,
    unknownOrgans,
    unknownLawReferences,
    missingBaseOrgans,
    missingDependencies: Object.freeze(missingDependencies.sort()),
    invalidContractRefs: Object.freeze(invalidContractRefs.sort()),
    canonicalMutationAuthorized: false
  });
}

export function deriveContractDrivenBuildPlan(compiled, { kernel = loadMachineKernel() } = {}) {
  const verification = verifyBlueprintKernelReferences(compiled, { kernel });
  if (!verification.ok) return Object.freeze({ state: 'REVIEW_REQUIRED', reason: verification.reason ?? 'BLUEPRINT_REFERENCE_VERIFICATION_FAILED', verification });

  const organBindings = compiled.blueprint.organs.map((organ) => {
    const contract = kernel.organRegistry[organ.organId];
    return Object.freeze({
      organId: organ.organId,
      criticality: contract.criticality,
      dependencies: Object.freeze([...contract.dependencies]),
      testBindings: Object.freeze([...contract.testBindings]),
      reviewTargets: Object.freeze([...contract.reviewTargets]),
      resourceMetrics: Object.freeze([...contract.resourceMetrics]),
      buildBinding: Object.freeze(cloneJson(contract.buildBinding))
    });
  });

  return Object.freeze({
    schemaVersion: 'SETKA_CONTRACT_DRIVEN_BUILD_PLAN_V1',
    state: 'VERIFIED',
    sourceBlueprintId: compiled.blueprint.blueprintId,
    organBindings: Object.freeze(organBindings),
    testBindings: Object.freeze(sortedUnique(organBindings.flatMap((item) => item.testBindings))),
    reviewTargets: Object.freeze(sortedUnique(organBindings.flatMap((item) => item.reviewTargets))),
    criticalOrganIds: Object.freeze(organBindings.filter((item) => item.criticality === 'CRITICAL').map((item) => item.organId).sort()),
    rule: kernel.contractDrivenKernel.principle,
    canonicalMutationAuthorized: false
  });
}

function requireOrgans(compiled, requiredIds) {
  if (compiled?.state !== 'COMPILED_CANDIDATE' || !compiled.blueprint) return ['BLUEPRINT_NOT_COMPILED'];
  const ids = new Set(compiled.blueprint.organs.map((organ) => organ.organId));
  return requiredIds.filter((id) => !ids.has(id));
}

export function compileProcessorCore(compiled, { kernel = loadMachineKernel(), laneCount = 1 } = {}) {
  if (!Number.isInteger(laneCount) || laneCount < 1) throw new TypeError('laneCount must be an integer >= 1');
  const required = ['PROCESSOR_CONTROL_UNIT', 'DETERMINISTIC_ALU', 'REGISTER_FILE', 'DERIVED_CACHE', 'INTERNAL_TYPED_BUS', 'PARALLEL_EXECUTION_LANES'];
  const missing = requireOrgans(compiled, required);
  if (missing.length > 0) return Object.freeze({ schemaVersion: PROCESSOR_CORE_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'PROCESSOR_CORE_ORGANS_MISSING', missingOrgans: Object.freeze(missing) });

  const buildPlan = deriveContractDrivenBuildPlan(compiled, { kernel });
  if (buildPlan.state !== 'VERIFIED') return Object.freeze({ schemaVersion: PROCESSOR_CORE_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'BUILD_PLAN_NOT_VERIFIED' });

  return Object.freeze({
    schemaVersion: PROCESSOR_CORE_PLAN_SCHEMA_VERSION,
    state: 'COMPILED',
    stages: Object.freeze([...kernel.processorCorePolicy.stages]),
    laneCount,
    registerSet: Object.freeze(['CURRENT_INSTRUCTION', 'STATE_REF', 'RESULT_REF', 'PROOF_REF', 'EXECUTION_TICK']),
    instructionOrganIds: Object.freeze(compiled.blueprint.organs.map((organ) => organ.organId)),
    testBindings: buildPlan.testBindings,
    canonicalWriteRule: kernel.processorCorePolicy.canonicalWriteRule,
    speculationRule: kernel.processorCorePolicy.speculationRule,
    registerRule: kernel.processorCorePolicy.registerRule,
    cacheRule: kernel.processorCorePolicy.cacheRule,
    parallelRule: kernel.processorCorePolicy.parallelRule,
    speculativeCanonicalWriteAllowed: false,
    canonicalMutationPerformed: false
  });
}

export function compileCellNucleus(compiled, { kernel = loadMachineKernel(), activationMask = null } = {}) {
  const required = ['GENOME_STORE', 'NUCLEAR_ENVELOPE', 'TRANSCRIPTION_EXPRESSION', 'EPIGENETIC_ACTIVATION', 'GENOME_REPLICATION_REPAIR'];
  const missing = requireOrgans(compiled, required);
  if (missing.length > 0) return Object.freeze({ schemaVersion: CELL_NUCLEUS_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'CELL_NUCLEUS_ORGANS_MISSING', missingOrgans: Object.freeze(missing) });

  const genotypeOrganIds = compiled.blueprint.organs.map((organ) => organ.organId).sort();
  const genotypeSet = new Set(genotypeOrganIds);
  let activeOrganIds = activationMask == null ? genotypeOrganIds : sortedUnique(activationMask);
  for (const organId of activeOrganIds) {
    if (!genotypeSet.has(organId)) return Object.freeze({ schemaVersion: CELL_NUCLEUS_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'ACTIVATION_OUTSIDE_GENOTYPE', organId });
  }

  const expressionManifest = activeOrganIds.map((organId) => Object.freeze({
    organId,
    contractRef: `SETKA_MACHINE_KERNEL_V1#organRegistry.${organId}`,
    buildBinding: Object.freeze(cloneJson(kernel.organRegistry[organId].buildBinding))
  }));

  return Object.freeze({
    schemaVersion: CELL_NUCLEUS_PLAN_SCHEMA_VERSION,
    state: 'COMPILED',
    genotype: Object.freeze({
      kernelVersion: kernel.schemaVersion,
      lawReferences: Object.freeze([...compiled.blueprint.lawReferences]),
      organContractRefs: Object.freeze(genotypeOrganIds.map((organId) => `SETKA_MACHINE_KERNEL_V1#organRegistry.${organId}`))
    }),
    epigeneticActivation: Object.freeze(activeOrganIds),
    expressionManifest: Object.freeze(expressionManifest),
    nuclearEnvelopeRule: kernel.cellNucleusPolicy.poreRule,
    transcriptionRule: kernel.cellNucleusPolicy.transcriptionRule,
    executionRule: kernel.cellNucleusPolicy.executionRule,
    replicationRule: kernel.cellNucleusPolicy.replicationRule,
    repairRule: kernel.cellNucleusPolicy.repairRule,
    genotypeMutationPerformed: false,
    expressionExecutionOccursOutsideNucleus: true
  });
}

export function compileSelfHostingKernel(intent, { kernel = loadMachineKernel(), laneCount = 1, activationMask = null } = {}) {
  validateShipIntent(intent);
  const selfHostingIntent = cloneJson(intent);
  selfHostingIntent.requestedCapabilities = sortedUnique([...intent.requestedCapabilities, 'SELF_HOSTING_KERNEL', 'SAFE_CONTROL']);
  const compiled = compileShipBlueprint(selfHostingIntent, { kernel });
  if (compiled.state !== 'COMPILED_CANDIDATE') return Object.freeze({ schemaVersion: SELF_HOSTING_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: compiled.reason, compiled });

  const buildPlan = deriveContractDrivenBuildPlan(compiled, { kernel });
  const processorCore = compileProcessorCore(compiled, { kernel, laneCount });
  const cellNucleus = compileCellNucleus(compiled, { kernel, activationMask });
  if (buildPlan.state !== 'VERIFIED' || processorCore.state !== 'COMPILED' || cellNucleus.state !== 'COMPILED') {
    return Object.freeze({ schemaVersion: SELF_HOSTING_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'SELF_HOST_COMPONENT_NOT_VERIFIED', buildPlan, processorCore, cellNucleus });
  }

  return Object.freeze({
    schemaVersion: SELF_HOSTING_KERNEL_SCHEMA_VERSION,
    state: 'SELF_HOSTING_CANDIDATE_COMPILED',
    blueprint: compiled.blueprint,
    buildPlan,
    processorCore,
    cellNucleus,
    loop: Object.freeze([...kernel.selfHostingPolicy.loop]),
    closureRule: kernel.selfHostingPolicy.closureRule,
    selfAcceptanceAllowed: false,
    canonicalMutationAuthorized: false,
    canonicalMutationPerformed: false
  });
}

export function shannonSurprisalBits(conditionalProbability) {
  const p = finiteNumber(conditionalProbability, 'conditionalProbability');
  if (p <= 0 || p > 1) throw new RangeError('conditionalProbability must be in (0, 1]');
  return -Math.log2(p);
}

export function minimumDescriptionLengthBits({ modelBits, parameterBits, residualBits, proofBits }) {
  return finiteNonNegative(modelBits, 'modelBits')
    + finiteNonNegative(parameterBits, 'parameterBits')
    + finiteNonNegative(residualBits, 'residualBits')
    + finiteNonNegative(proofBits, 'proofBits');
}

export function informationBottleneckObjective({ iXT, iTY, beta }) {
  iXT = finiteNonNegative(iXT, 'iXT');
  iTY = finiteNonNegative(iTY, 'iTY');
  beta = finiteNonNegative(beta, 'beta');
  return iXT - beta * iTY;
}

export function rateDistortionObjective({ rateBits, distortion, lambda }) {
  rateBits = finiteNonNegative(rateBits, 'rateBits');
  distortion = finiteNonNegative(distortion, 'distortion');
  lambda = finiteNonNegative(lambda, 'lambda');
  return rateBits + lambda * distortion;
}

export function graphLaplacianMorphogenesisStep({ state, edges, reactionDelta = null, diffusion = 1, dt = 1 }) {
  if (!Array.isArray(state) || state.length === 0) throw new TypeError('state must be a non-empty numeric array');
  const x = state.map((value, index) => finiteNumber(value, `state[${index}]`));
  if (!Array.isArray(edges)) throw new TypeError('edges must be an array');
  diffusion = finiteNonNegative(diffusion, 'diffusion');
  dt = finiteNonNegative(dt, 'dt');
  const reaction = reactionDelta == null ? Array.from({ length: x.length }, () => 0) : reactionDelta.map((value, index) => finiteNumber(value, `reactionDelta[${index}]`));
  if (reaction.length !== x.length) throw new RangeError('reactionDelta dimension mismatch');

  const laplacian = Array.from({ length: x.length }, () => 0);
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    if (!Number.isInteger(edge?.from) || !Number.isInteger(edge?.to) || edge.from < 0 || edge.to < 0 || edge.from >= x.length || edge.to >= x.length) {
      throw new RangeError(`edges[${index}] has invalid node index`);
    }
    const weight = edge.weight == null ? 1 : finiteNonNegative(edge.weight, `edges[${index}].weight`);
    const flow = weight * (x[edge.to] - x[edge.from]);
    laplacian[edge.from] += flow;
    laplacian[edge.to] -= flow;
  }
  return Object.freeze(x.map((value, index) => value + dt * (reaction[index] + diffusion * laplacian[index])));
}

export function coarseGrainWeightedMean({ values, groups, weights = null }) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError('values must be a non-empty numeric array');
  const x = values.map((value, index) => finiteNumber(value, `values[${index}]`));
  if (!Array.isArray(groups) || groups.length === 0) throw new TypeError('groups must be a non-empty array');
  const w = weights == null ? Array.from({ length: x.length }, () => 1) : weights.map((value, index) => finiteNonNegative(value, `weights[${index}]`));
  if (w.length !== x.length) throw new RangeError('weights dimension mismatch');

  return Object.freeze(groups.map((group, groupIndex) => {
    if (!Array.isArray(group) || group.length === 0) throw new TypeError(`groups[${groupIndex}] must be a non-empty index array`);
    let numerator = 0;
    let denominator = 0;
    for (const index of group) {
      if (!Number.isInteger(index) || index < 0 || index >= x.length) throw new RangeError(`groups[${groupIndex}] contains invalid index`);
      numerator += x[index] * w[index];
      denominator += w[index];
    }
    if (denominator <= 0) throw new RangeError(`groups[${groupIndex}] has zero total weight`);
    return numerator / denominator;
  }));
}

export function assessCandidateInvariant({ values, tolerance = 1e-12, symmetryEvidence = false }) {
  if (!Array.isArray(values) || values.length < 2) throw new TypeError('values must contain at least two numeric samples');
  const samples = values.map((value, index) => finiteNumber(value, `values[${index}]`));
  tolerance = finiteNonNegative(tolerance, 'tolerance');
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const drift = max - min;
  return Object.freeze({
    schemaVersion: 'SETKA_INVARIANT_EVIDENCE_V1',
    state: drift <= tolerance
      ? (symmetryEvidence ? 'DECLARED_INVARIANT_CONSISTENT_WITH_SAMPLES' : 'NUMERICALLY_STABLE_BUT_NOETHER_LINK_UNPROVEN')
      : 'INVARIANT_CANDIDATE_REJECTED_BY_SAMPLES',
    drift,
    tolerance,
    symmetryEvidence: Boolean(symmetryEvidence),
    generalSymbolicNoetherSolverClaimed: false,
    globalConservationProven: false
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
  },
  PIPELINE_HAZARD: {
    mutationClass: 'EXECUTION_PLAN',
    action: 'STALL_OR_REORDER_ONLY_WITHIN_DECLARED_CAUSAL_DEPENDENCY_SEMANTICS',
    autoApplyClass: 'LOCAL_EXECUTION_PLAN_SELECTION'
  },
  CACHE_IDENTITY_MISMATCH: {
    mutationClass: 'RUNTIME_TUNING',
    action: 'INVALIDATE_DERIVED_CACHE_AND_RECOMPUTE',
    autoApplyClass: 'CACHE_OR_REUSE_SELECTION'
  },
  BARRIER_VIOLATION: {
    mutationClass: 'SAFE_CONTROL',
    action: 'BLOCK_ACTION_AND_BRANCH_FOR_A_BARRIER_PRESERVING_WITNESS_ACTION',
    autoApplyClass: null
  },
  GENOME_INTEGRITY_DRIFT: {
    mutationClass: 'KERNEL_REPAIR_CANDIDATE',
    action: 'COMPARE_WITH_KNOWN_GOOD_VERSION_AND_PREPARE_APPEND_ONLY_REPAIR_PLAN',
    autoApplyClass: null
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
