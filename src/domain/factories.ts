import {
  CURRENT_ESTIMATION_SCHEMA_VERSION,
  type EntityId,
  type EstimationActivity,
  type EstimationProject,
  type EstimationSchedule,
  type IsoDateTimeString,
  type QaActivity,
} from './estimation'

export interface EntityFactoryDependencies {
  createId: () => EntityId
  now: () => IsoDateTimeString
}

export const defaultEntityFactoryDependencies: EntityFactoryDependencies = {
  createId: () => globalThis.crypto.randomUUID(),
  now: () => new Date().toISOString(),
}

export const STANDARD_ESTIMATION_ACTIVITY_NAMES = [
  'Requirement Analysis / Investigation',
  'Backend Development',
  'Frontend / UI Development',
  'Database / Migration',
  'Unit Tests',
  'Integration / Manual Testing',
  'Code Review / Rework',
  'Documentation / Deployment Support',
] as const

export const DEFAULT_QA_ACTIVITY_NAMES = [
  'QA Analysis / Test Planning',
  'Test Case Preparation',
  'Functional Testing',
  'Regression Testing',
  'Bug Retesting / Verification',
  'UAT / Release Validation Support',
] as const

export function createStandardEstimationActivities(
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ReadonlyArray<EstimationActivity> {
  return STANDARD_ESTIMATION_ACTIVITY_NAMES.map((name) => ({
    id: dependencies.createId(),
    name,
    hours: 0,
  }))
}

export function createDefaultQaActivities(
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): ReadonlyArray<QaActivity> {
  return DEFAULT_QA_ACTIVITY_NAMES.map((name) => ({
    id: dependencies.createId(),
    name,
    hours: 0,
  }))
}

export function createDefaultSchedule(): EstimationSchedule {
  return {
    riskBufferPercentage: 15,
    workingHoursPerPersonDay: 8,
    totalManpower: 1,
    businessDaysPerWeek: 5,
  }
}

export function createEmptyEstimationProject(
  name = 'Untitled Estimate',
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): EstimationProject {
  const timestamp = dependencies.now()
  const id = dependencies.createId()

  return {
    id,
    schemaVersion: CURRENT_ESTIMATION_SCHEMA_VERSION,
    name,
    developmentItems: [],
    qaActivities: createDefaultQaActivities(dependencies),
    schedule: createDefaultSchedule(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
