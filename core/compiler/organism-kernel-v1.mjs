import { readFileSync } from 'node:fs';
import {
  compileSelfHostingKernel,
  loadMachineKernel,
  validateMachineKernelSelfKnowledge
} from './ship-kernel-compiler.mjs';

export const ORGANISM_KERNEL_SCHEMA_VERSION = 'SETKA_LIVING_ORGANISM_KERNEL_V1';
export const RIBOSOME_PLAN_SCHEMA_VERSION = 'SETKA_RIBOSOME_TRANSLATION_PLAN_V1';
export const MULTI_TIME_CLOCK_SCHEMA_VERSION = 'SETKA_MULTI_TIME_CLOCK_V1';
export const INTERRUPT_ARBITRATION_SCHEMA_VERSION = 'SETKA_INTERRUPT_ARBITRATION_V1';
export const HOMEOSTASIS_SCHEMA_VERSION = 'SETKA_HOMEOSTASIS_V1';

const ORGANISM_EXTENSION_URL = new URL('./setka-organism-extension-v1.json', import.meta.url);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
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

function integerNonNegative(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be an integer >= 0`);
  return value;
}

function mergeOrganismExtension(baseKernel, extension) {
  if (!extension || extension.schemaVersion !== 'SETKA_ORGANISM_EXTENSION_V1') {
    throw new TypeError('unsupported organism kernel extension version');
  }

  const kernel = cloneJson(baseKernel);
  kernel.lawRegistry = { ...kernel.lawRegistry };
  kernel.organRegistry = { ...kernel.organRegistry };
  kernel.capabilityRegistry = { ...kernel.capabilityRegistry };

  for (const [lawId, law] of Object.entries(extension.lawRegistry ?? {})) {
    if (Object.hasOwn(kernel.lawRegistry, lawId)) throw new RangeError(`duplicate organism law: ${lawId}`);
    kernel.lawRegistry[lawId] = cloneJson(law);
  }

  for (const [organId, contract] of Object.entries(extension.organRegistry ?? {})) {
    if (Object.hasOwn(kernel.organRegistry, organId)) throw new RangeError(`duplicate organism organ: ${organId}`);
    kernel.organRegistry[organId] = cloneJson(contract);
  }

  for (const [capability, organIds] of Object.entries(extension.capabilityRegistry ?? {})) {
    if (!Array.isArray(organIds)) throw new TypeError(`organism capability ${capability} must be an array`);
    kernel.capabilityRegistry[capability] = sortedUnique([...(kernel.capabilityRegistry[capability] ?? []), ...organIds]);
  }

  kernel.organismPolicy = cloneJson(extension.organismPolicy);
  kernel.selfHostingPolicy = {
    ...kernel.selfHostingPolicy,
    loop: cloneJson(extension.organismPolicy.loop),
    closureRule: extension.organismPolicy.closureRule
  };
  kernel.extensionSources = sortedUnique([
    ...(kernel.extensionSources ?? []),
    'core/compiler/setka-organism-extension-v1.json'
  ]);
  return kernel;
}

export function loadOrganismKernel() {
  const baseKernel = loadMachineKernel();
  const extension = JSON.parse(readFileSync(ORGANISM_EXTENSION_URL, 'utf8'));
  const kernel = mergeOrganismExtension(baseKernel, extension);
  const selfKnowledge = validateMachineKernelSelfKnowledge({ kernel });
  if (!selfKnowledge.ok) throw new TypeError(`organism kernel self-knowledge invalid: ${selfKnowledge.issues.join(', ')}`);
  return Object.freeze(kernel);
}

export function translateExpressionManifest(cellNucleus, { kernel = loadOrganismKernel() } = {}) {
  if (cellNucleus?.state !== 'COMPILED' || !Array.isArray(cellNucleus.expressionManifest)) {
    return Object.freeze({
      schemaVersion: RIBOSOME_PLAN_SCHEMA_VERSION,
      state: 'REVIEW_REQUIRED',
      reason: 'NUCLEAR_EXPRESSION_MANIFEST_NOT_COMPILED',
      translationPlan: null
    });
  }

  const translated = [];
  for (const item of cellNucleus.expressionManifest) {
    const contract = kernel.organRegistry[item.organId];
    if (!contract) {
      return Object.freeze({ schemaVersion: RIBOSOME_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'UNKNOWN_EXPRESSED_ORGAN', organId: item.organId, translationPlan: null });
    }
    const expectedRef = `SETKA_MACHINE_KERNEL_V1#organRegistry.${item.organId}`;
    if (item.contractRef !== expectedRef) {
      return Object.freeze({ schemaVersion: RIBOSOME_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'EXPRESSION_CONTRACT_REF_MISMATCH', organId: item.organId, translationPlan: null });
    }
    if (!contract.buildBinding?.kind || !contract.buildBinding?.target) {
      return Object.freeze({ schemaVersion: RIBOSOME_PLAN_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'BUILD_BINDING_UNKNOWN', organId: item.organId, translationPlan: null });
    }
    translated.push(Object.freeze({
      organId: item.organId,
      contractRef: expectedRef,
      dependencies: Object.freeze([...contract.dependencies]),
      buildBinding: Object.freeze(cloneJson(contract.buildBinding)),
      criticality: contract.criticality,
      testBindings: Object.freeze([...contract.testBindings])
    }));
  }

  return Object.freeze({
    schemaVersion: RIBOSOME_PLAN_SCHEMA_VERSION,
    state: 'TRANSLATED_BUILD_PLAN',
    translationPlan: Object.freeze(translated),
    translatedOrganCount: translated.length,
    externalMaterializationPerformed: false,
    genotypeMutationPerformed: false,
    canonicalMutationPerformed: false,
    rule: kernel.organismPolicy.translationRule
  });
}

export function advanceMultiTimeClock({
  clock = { externalEpochMs: 0, shipTick: 0, mathematicalStep: 0 },
  externalDeltaMs = 0,
  shipTickDelta = 0,
  mathematicalStepDelta = 0,
  mappingContract = null
} = {}) {
  const externalEpochMs = finiteNonNegative(clock.externalEpochMs, 'clock.externalEpochMs');
  const shipTick = integerNonNegative(clock.shipTick, 'clock.shipTick');
  const mathematicalStep = integerNonNegative(clock.mathematicalStep, 'clock.mathematicalStep');
  externalDeltaMs = finiteNonNegative(externalDeltaMs, 'externalDeltaMs');
  shipTickDelta = integerNonNegative(shipTickDelta, 'shipTickDelta');
  mathematicalStepDelta = integerNonNegative(mathematicalStepDelta, 'mathematicalStepDelta');

  return Object.freeze({
    schemaVersion: MULTI_TIME_CLOCK_SCHEMA_VERSION,
    state: 'ADVANCED',
    coordinate: Object.freeze({
      externalEpochMs: externalEpochMs + externalDeltaMs,
      shipTick: shipTick + shipTickDelta,
      mathematicalStep: mathematicalStep + mathematicalStepDelta
    }),
    axesCoupled: mappingContract != null,
    mappingContract: mappingContract == null ? null : Object.freeze(cloneJson(mappingContract)),
    inferredAxisConversion: false,
    rule: 'EXTERNAL_CHRONOLOGY_SHIP_LOGICAL_TIME_AND_MATHEMATICAL_STEPS_REMAIN_DISTINCT_UNLESS_AN_EXPLICIT_MAPPING_CONTRACT_IS_PRESENT'
  });
}

export function arbitrateInterrupts({ interrupts = [] } = {}) {
  if (!Array.isArray(interrupts)) throw new TypeError('interrupts must be an array');
  const ready = [];
  const blocked = [];

  for (let index = 0; index < interrupts.length; index += 1) {
    const interrupt = interrupts[index];
    if (!interrupt || typeof interrupt !== 'object') throw new TypeError(`interrupts[${index}] must be an object`);
    if (typeof interrupt.interruptId !== 'string' || interrupt.interruptId.length === 0) throw new TypeError(`interrupts[${index}].interruptId must be a non-empty string`);
    const priority = finiteNumber(interrupt.priority, `interrupts[${index}].priority`);
    const due = interrupt.due === true;
    const dependenciesResolved = interrupt.dependenciesResolved === true;
    const safetyGatePassed = interrupt.safetyGatePassed === true;
    const normalized = Object.freeze({
      interruptId: interrupt.interruptId,
      priority,
      sourceAxis: interrupt.sourceAxis ?? 'DECLARED_EVENT',
      due,
      dependenciesResolved,
      safetyGatePassed
    });
    if (due && dependenciesResolved && safetyGatePassed) ready.push(normalized);
    else blocked.push(normalized);
  }

  ready.sort((a, b) => b.priority - a.priority || a.interruptId.localeCompare(b.interruptId));
  blocked.sort((a, b) => a.interruptId.localeCompare(b.interruptId));

  return Object.freeze({
    schemaVersion: INTERRUPT_ARBITRATION_SCHEMA_VERSION,
    state: ready.length > 0 ? 'INTERRUPT_SELECTED' : 'NO_READY_INTERRUPT',
    selectedInterrupt: ready[0] ?? null,
    readyQueue: Object.freeze(ready),
    blockedInterrupts: Object.freeze(blocked),
    canonicalCausalReorderingAuthorized: false,
    writebackAuthorityBypassed: false
  });
}

export function assessHomeostasis({ resources = [], warningMargin = 0.1 } = {}) {
  if (!Array.isArray(resources) || resources.length === 0) throw new TypeError('resources must be a non-empty array');
  warningMargin = finiteNonNegative(warningMargin, 'warningMargin');
  if (warningMargin > 0.5) throw new RangeError('warningMargin must be <= 0.5');

  const assessments = resources.map((resource, index) => {
    if (!resource || typeof resource !== 'object') throw new TypeError(`resources[${index}] must be an object`);
    if (typeof resource.resourceId !== 'string' || resource.resourceId.length === 0) throw new TypeError(`resources[${index}].resourceId must be a non-empty string`);
    const value = finiteNumber(resource.value, `resources[${index}].value`);
    const min = finiteNumber(resource.min, `resources[${index}].min`);
    const max = finiteNumber(resource.max, `resources[${index}].max`);
    if (!(max > min)) throw new RangeError(`resources[${index}] max must be > min`);
    const target = resource.target == null ? (min + max) / 2 : finiteNumber(resource.target, `resources[${index}].target`);
    if (target < min || target > max) throw new RangeError(`resources[${index}] target must be inside [min,max]`);
    const span = max - min;
    const inside = value >= min && value <= max;
    const lowerMargin = (value - min) / span;
    const upperMargin = (max - value) / span;
    const margin = Math.min(lowerMargin, upperMargin);
    const normalizedDeviation = Math.abs(value - target) / span;
    const hard = resource.hard !== false;
    const classification = !inside
      ? (hard ? 'HARD_RANGE_VIOLATION' : 'SOFT_RANGE_VIOLATION')
      : (margin <= warningMargin ? 'NEAR_BOUNDARY' : 'WITHIN_RANGE');
    return Object.freeze({ resourceId: resource.resourceId, value, min, max, target, hard, margin, normalizedDeviation, classification });
  });

  const hardViolations = assessments.filter((item) => item.classification === 'HARD_RANGE_VIOLATION');
  const softViolations = assessments.filter((item) => item.classification === 'SOFT_RANGE_VIOLATION');
  const nearBoundary = assessments.filter((item) => item.classification === 'NEAR_BOUNDARY');
  const state = hardViolations.length > 0
    ? 'SAFE_CONTROL_REQUIRED'
    : (softViolations.length > 0 || nearBoundary.length > 0 ? 'REGULATION_CANDIDATE' : 'HOMEOSTATIC');

  return Object.freeze({
    schemaVersion: HOMEOSTASIS_SCHEMA_VERSION,
    state,
    assessments: Object.freeze(assessments),
    minimumMargin: Math.min(...assessments.map((item) => item.margin)),
    hardViolationIds: Object.freeze(hardViolations.map((item) => item.resourceId).sort()),
    regulationCandidateIds: Object.freeze([...softViolations, ...nearBoundary].map((item) => item.resourceId).sort()),
    costOptimizationAllowed: hardViolations.length === 0,
    safeControlRequired: hardViolations.length > 0,
    canonicalMutationAuthorized: false
  });
}

export function compileLivingKernel(intent, { laneCount = 1, activationMask = null, kernel = loadOrganismKernel() } = {}) {
  const selfHosting = compileSelfHostingKernel(intent, { kernel, laneCount, activationMask });
  if (selfHosting.state !== 'SELF_HOSTING_CANDIDATE_COMPILED') {
    return Object.freeze({ schemaVersion: ORGANISM_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'SELF_HOSTING_KERNEL_NOT_COMPILED', selfHosting });
  }

  const requiredOrgans = ['RIBOSOME_ORGAN_FACTORY', 'MULTI_TIME_CLOCK', 'INTERRUPT_CONTROLLER', 'HOMEOSTATIC_METABOLISM'];
  const blueprintIds = new Set(selfHosting.blueprint.organs.map((organ) => organ.organId));
  const missingOrgans = requiredOrgans.filter((organId) => !blueprintIds.has(organId));
  if (missingOrgans.length > 0) {
    return Object.freeze({ schemaVersion: ORGANISM_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'ORGANISM_ORGANS_MISSING', missingOrgans: Object.freeze(missingOrgans), selfHosting });
  }

  const ribosome = translateExpressionManifest(selfHosting.cellNucleus, { kernel });
  if (ribosome.state !== 'TRANSLATED_BUILD_PLAN') {
    return Object.freeze({ schemaVersion: ORGANISM_KERNEL_SCHEMA_VERSION, state: 'REVIEW_REQUIRED', reason: 'RIBOSOMAL_TRANSLATION_NOT_VERIFIED', ribosome, selfHosting });
  }

  return Object.freeze({
    schemaVersion: ORGANISM_KERNEL_SCHEMA_VERSION,
    state: 'LIVING_KERNEL_CANDIDATE_COMPILED',
    blueprint: selfHosting.blueprint,
    buildPlan: selfHosting.buildPlan,
    cellNucleus: selfHosting.cellNucleus,
    ribosome,
    processorCore: selfHosting.processorCore,
    organismLoop: Object.freeze([...kernel.organismPolicy.loop]),
    initialClock: Object.freeze({ externalEpochMs: 0, shipTick: 0, mathematicalStep: 0 }),
    homeostasisOrganRef: 'SETKA_MACHINE_KERNEL_V1#organRegistry.HOMEOSTATIC_METABOLISM',
    sensingOrganRef: 'SETKA_MACHINE_KERNEL_V1#organRegistry.SELF_DIAGNOSTIC',
    selfAcceptanceAllowed: false,
    canonicalMutationAuthorized: false,
    canonicalMutationPerformed: false
  });
}
