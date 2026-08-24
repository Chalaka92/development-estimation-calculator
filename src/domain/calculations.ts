import type {
  DevelopmentWorkItem,
  EstimateSummary,
  EstimationActivity,
  EstimationCalculationInput,
  EstimationSchedule,
  QaActivity,
} from './estimation'

const DEFAULT_WORKING_HOURS_PER_PERSON_DAY = 8
const MINIMUM_WORKING_HOURS_PER_PERSON_DAY = 0.25
const DEFAULT_TOTAL_MANPOWER = 1
const MINIMUM_TOTAL_MANPOWER = 0.1
const DEFAULT_BUSINESS_DAYS_PER_WEEK = 5
const MINIMUM_BUSINESS_DAYS_PER_WEEK = 1

function finiteNumberOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function finiteNonZeroNumberOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) && value !== 0 ? value : fallback
}

export function calculateEstimationHours(
  estimation: ReadonlyArray<EstimationActivity>,
): number {
  return estimation.reduce(
    (total, activity) => total + finiteNumberOrZero(activity.hours),
    0,
  )
}

export function calculateDevelopmentItemHours(
  item: DevelopmentWorkItem,
): number {
  if (item.subItems.length > 0) {
    return item.subItems.reduce(
      (total, subItem) => total + calculateEstimationHours(subItem.estimation),
      0,
    )
  }

  return calculateEstimationHours(item.directEstimation)
}

export function calculateDevelopmentHours(
  items: ReadonlyArray<DevelopmentWorkItem>,
): number {
  return items.reduce(
    (total, item) => total + calculateDevelopmentItemHours(item),
    0,
  )
}

export function calculateQaHours(
  activities: ReadonlyArray<QaActivity>,
): number {
  return activities.reduce(
    (total, activity) => total + finiteNumberOrZero(activity.hours),
    0,
  )
}

function normalizeSchedule(schedule: EstimationSchedule): EstimationSchedule {
  const workingHoursPerPersonDay = Math.max(
    finiteNonZeroNumberOrDefault(
      schedule.workingHoursPerPersonDay,
      DEFAULT_WORKING_HOURS_PER_PERSON_DAY,
    ),
    MINIMUM_WORKING_HOURS_PER_PERSON_DAY,
  )

  const totalManpower = Math.max(
    finiteNonZeroNumberOrDefault(
      schedule.totalManpower,
      DEFAULT_TOTAL_MANPOWER,
    ),
    MINIMUM_TOTAL_MANPOWER,
  )

  const requestedBusinessDays = Math.trunc(
    finiteNonZeroNumberOrDefault(
      schedule.businessDaysPerWeek,
      DEFAULT_BUSINESS_DAYS_PER_WEEK,
    ),
  )

  return {
    riskBufferPercentage: finiteNumberOrZero(schedule.riskBufferPercentage),
    workingHoursPerPersonDay,
    totalManpower,
    businessDaysPerWeek: Math.max(
      requestedBusinessDays,
      MINIMUM_BUSINESS_DAYS_PER_WEEK,
    ),
  }
}

export function calculateEstimate(
  input: EstimationCalculationInput,
): EstimateSummary {
  const developmentHours = calculateDevelopmentHours(input.developmentItems)
  const qaHours = calculateQaHours(input.qaActivities)
  const baseHours = developmentHours + qaHours
  const schedule = normalizeSchedule(input.schedule)
  const riskBufferHours =
    (baseHours * schedule.riskBufferPercentage) / 100
  const finalHours = baseHours + riskBufferHours
  const personDays = finalHours / schedule.workingHoursPerPersonDay
  const deliveryWorkingDays = personDays / schedule.totalManpower
  const weeklyCapacityHours =
    schedule.workingHoursPerPersonDay *
    schedule.businessDaysPerWeek *
    schedule.totalManpower
  const businessWeeks = weeklyCapacityHours
    ? finalHours / weeklyCapacityHours
    : 0

  return {
    developmentHours,
    qaHours,
    baseHours,
    riskBufferPercentage: schedule.riskBufferPercentage,
    riskBufferHours,
    finalHours,
    workingHoursPerPersonDay: schedule.workingHoursPerPersonDay,
    totalManpower: schedule.totalManpower,
    businessDaysPerWeek: schedule.businessDaysPerWeek,
    personDays,
    deliveryWorkingDays,
    weeklyCapacityHours,
    businessWeeks,
  }
}
