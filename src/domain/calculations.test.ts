import { describe, expect, it } from 'vitest'
import {
  calculateDevelopmentHours,
  calculateDevelopmentItemHours,
  calculateEstimate,
  calculateEstimationHours,
  calculateQaHours,
} from './calculations'
import type {
  DevelopmentWorkItem,
  EstimationActivity,
  EstimationCalculationInput,
} from './estimation'

function activity(id: string, hours: number): EstimationActivity {
  return { id, name: id, hours }
}

function directItem(
  id: string,
  hours: ReadonlyArray<number>,
): DevelopmentWorkItem {
  return {
    id,
    name: id,
    directEstimation: hours.map((value, index) =>
      activity(`${id}-activity-${index}`, value),
    ),
    subItems: [],
  }
}

const defaultSchedule = {
  riskBufferPercentage: 15,
  workingHoursPerPersonDay: 8,
  totalManpower: 1,
  businessDaysPerWeek: 5,
}

describe('estimation totals', () => {
  it('sums finite estimation and QA hours', () => {
    expect(
      calculateEstimationHours([
        activity('analysis', 3.5),
        activity('implementation', 8),
      ]),
    ).toBe(11.5)

    expect(
      calculateQaHours([
        { id: 'qa-1', name: 'Functional testing', hours: 4 },
        { id: 'qa-2', name: 'Regression testing', hours: 2.5 },
      ]),
    ).toBe(6.5)
  })

  it('ignores non-finite hour values', () => {
    expect(
      calculateEstimationHours([
        activity('valid', 5),
        activity('not-a-number', Number.NaN),
        activity('infinite', Number.POSITIVE_INFINITY),
      ]),
    ).toBe(5)
  })

  it('uses direct estimates when a work item has no sub-items', () => {
    expect(calculateDevelopmentItemHours(directItem('billing', [5, 7]))).toBe(
      12,
    )
  })

  it('uses sub-item estimates instead of direct estimates when sub-items exist', () => {
    const item: DevelopmentWorkItem = {
      id: 'billing',
      name: 'Billing',
      directEstimation: [activity('ignored-direct-estimate', 100)],
      subItems: [
        {
          id: 'billing-import',
          name: 'Import',
          estimation: [activity('import-api', 8), activity('import-ui', 4)],
        },
        {
          id: 'billing-settings',
          name: 'Settings',
          estimation: [activity('settings-ui', 5)],
        },
      ],
    }

    expect(calculateDevelopmentItemHours(item)).toBe(17)
    expect(calculateDevelopmentHours([item, directItem('receipts', [6])])).toBe(
      23,
    )
  })
})

describe('estimate calculation', () => {
  it('calculates effort, buffer, decimal manpower, and delivery duration', () => {
    const input: EstimationCalculationInput = {
      developmentItems: [directItem('feature', [10, 14])],
      qaActivities: [{ id: 'qa', name: 'QA', hours: 6 }],
      schedule: {
        riskBufferPercentage: 20,
        workingHoursPerPersonDay: 6,
        totalManpower: 1.5,
        businessDaysPerWeek: 4,
      },
    }

    expect(calculateEstimate(input)).toEqual({
      developmentHours: 24,
      qaHours: 6,
      baseHours: 30,
      riskBufferPercentage: 20,
      riskBufferHours: 6,
      finalHours: 36,
      workingHoursPerPersonDay: 6,
      totalManpower: 1.5,
      businessDaysPerWeek: 4,
      personDays: 6,
      deliveryWorkingDays: 4,
      weeklyCapacityHours: 36,
      businessWeeks: 1,
    })
  })

  it('returns zero effort and duration for an empty estimate', () => {
    const result = calculateEstimate({
      developmentItems: [],
      qaActivities: [],
      schedule: defaultSchedule,
    })

    expect(result.developmentHours).toBe(0)
    expect(result.qaHours).toBe(0)
    expect(result.finalHours).toBe(0)
    expect(result.deliveryWorkingDays).toBe(0)
    expect(result.businessWeeks).toBe(0)
  })

  it('uses the same zero-value fallbacks as the v16 calculator', () => {
    const result = calculateEstimate({
      developmentItems: [directItem('feature', [40])],
      qaActivities: [],
      schedule: {
        riskBufferPercentage: 0,
        workingHoursPerPersonDay: 0,
        totalManpower: 0,
        businessDaysPerWeek: 0,
      },
    })

    expect(result.workingHoursPerPersonDay).toBe(8)
    expect(result.totalManpower).toBe(1)
    expect(result.businessDaysPerWeek).toBe(5)
    expect(result.deliveryWorkingDays).toBe(5)
    expect(result.businessWeeks).toBe(1)
  })

  it('uses the same minimum schedule values as the v16 calculator', () => {
    const result = calculateEstimate({
      developmentItems: [directItem('feature', [1])],
      qaActivities: [],
      schedule: {
        riskBufferPercentage: 0,
        workingHoursPerPersonDay: -2,
        totalManpower: -3,
        businessDaysPerWeek: -4,
      },
    })

    expect(result.workingHoursPerPersonDay).toBe(0.25)
    expect(result.totalManpower).toBe(0.1)
    expect(result.businessDaysPerWeek).toBe(1)
    expect(result.deliveryWorkingDays).toBe(40)
    expect(result.weeklyCapacityHours).toBe(0.025)
    expect(result.businessWeeks).toBe(40)
  })
})
