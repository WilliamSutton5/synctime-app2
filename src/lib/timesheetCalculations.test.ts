import { describe, expect, it } from 'vitest'
import type { Hours } from '../types/timesheet'
import {
  calculateDailyTotal,
  calculatePeriodTotals,
  inputToNumber,
} from './timesheetCalculations'

const hours = (overrides: Partial<Hours> = {}): Hours => ({
  regular: 0,
  holiday: 0,
  sick: 0,
  vacation: 0,
  overtime: 0,
  ...overrides,
})

describe('timesheet calculations', () => {
  it('adds all categories for a daily total', () => {
    expect(
      calculateDailyTotal(
        hours({ regular: 4, holiday: 1, sick: 0.5, vacation: 2, overtime: 1 }),
      ),
    ).toBe(8.5)
  })

  it('adds category and grand totals across a period', () => {
    expect(
      calculatePeriodTotals([
        hours({ regular: 4, vacation: 4 }),
        hours({ regular: 8, overtime: 1.5 }),
      ]),
    ).toEqual({
      regular: 12,
      holiday: 0,
      sick: 0,
      vacation: 4,
      overtime: 1.5,
      grandTotal: 17.5,
    })
  })

  it('avoids common decimal addition artifacts', () => {
    expect(calculateDailyTotal(hours({ regular: 0.1, holiday: 0.2 }))).toBe(0.3)
  })

  it('treats blanks as zero and rejects invalid values', () => {
    expect(inputToNumber('')).toBe(0)
    expect(inputToNumber('7.5')).toBe(7.5)
    expect(inputToNumber('-1')).toBe(0)
    expect(inputToNumber('hours')).toBe(0)
  })
})
