import {
  CURRENT_ESTIMATION_SCHEMA_VERSION,
  type EntityId,
  type EstimationProject,
  type IsoDateTimeString,
} from './estimation'

export interface EntityFactoryDependencies {
  createId: () => EntityId
  now: () => IsoDateTimeString
}

export const defaultEntityFactoryDependencies: EntityFactoryDependencies = {
  createId: () => globalThis.crypto.randomUUID(),
  now: () => new Date().toISOString(),
}

export function createEmptyEstimationProject(
  name = 'Untitled Estimate',
  dependencies: EntityFactoryDependencies = defaultEntityFactoryDependencies,
): EstimationProject {
  const timestamp = dependencies.now()

  return {
    id: dependencies.createId(),
    schemaVersion: CURRENT_ESTIMATION_SCHEMA_VERSION,
    name,
    developmentItems: [],
    qaActivities: [],
    schedule: {
      riskBufferPercentage: 15,
      workingHoursPerPersonDay: 8,
      totalManpower: 1,
      businessDaysPerWeek: 5,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
