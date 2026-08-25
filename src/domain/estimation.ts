export const CURRENT_ESTIMATION_SCHEMA_VERSION = 1 as const

export type EntityId = string
export type IsoDateTimeString = string
export type RiskLevel = 'low' | 'medium' | 'high'

export interface ThreePointEstimate {
  optimisticHours: number
  mostLikelyHours: number
  pessimisticHours: number
}

export interface EstimationActivity {
  id: EntityId
  name: string
  hours: number
  threePointEstimate?: ThreePointEstimate
  role?: string
  riskLevel?: RiskLevel
  confidencePercentage?: number
  notes?: string
}

export interface DevelopmentSubItem {
  id: EntityId
  name: string
  estimation: ReadonlyArray<EstimationActivity>
  dependencyIds?: ReadonlyArray<EntityId>
}

export interface DevelopmentWorkItem {
  id: EntityId
  name: string
  directEstimation: ReadonlyArray<EstimationActivity>
  subItems: ReadonlyArray<DevelopmentSubItem>
  dependencyIds?: ReadonlyArray<EntityId>
}

export interface QaActivity {
  id: EntityId
  name: string
  hours: number
  threePointEstimate?: ThreePointEstimate
  role?: string
  riskLevel?: RiskLevel
  confidencePercentage?: number
  notes?: string
}

export interface EstimationSchedule {
  riskBufferPercentage: number
  workingHoursPerPersonDay: number
  totalManpower: number
  businessDaysPerWeek: number
}

export interface EstimationProject {
  id: EntityId
  schemaVersion: typeof CURRENT_ESTIMATION_SCHEMA_VERSION
  name: string
  developmentItems: ReadonlyArray<DevelopmentWorkItem>
  qaActivities: ReadonlyArray<QaActivity>
  schedule: EstimationSchedule
  createdAt: IsoDateTimeString
  updatedAt: IsoDateTimeString
}

export interface EstimateSummary {
  developmentHours: number
  qaHours: number
  baseHours: number
  riskBufferPercentage: number
  riskBufferHours: number
  finalHours: number
  workingHoursPerPersonDay: number
  totalManpower: number
  businessDaysPerWeek: number
  personDays: number
  deliveryWorkingDays: number
  weeklyCapacityHours: number
  businessWeeks: number
}

export type EstimationCalculationInput = Pick<
  EstimationProject,
  'developmentItems' | 'qaActivities' | 'schedule'
>
