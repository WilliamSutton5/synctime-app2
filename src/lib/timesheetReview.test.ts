import { describe, expect, it } from 'vitest'
import {
  hourCategories,
  type EntryDraft,
  type Hours,
} from '../types/timesheet'
import { calculateDailyTotal, calculatePeriodTotals, draftToHours } from './timesheetCalculations'
import {
  getNonzeroHourCategories,
  getNonzeroReviewEntries,
} from './timesheetReview'

const entry = (
  entryDate: string,
  overrides: Partial<Omit<EntryDraft, 'entryDate'>> = {},
): EntryDraft => ({
  entryDate,
  regular: '',
  holiday: '',
  sick: '',
  vacation: '',
  overtime: '',
  ...overrides,
})

const hours = (overrides: Partial<Hours> = {}): Hours => ({
  regular: 0,
  holiday: 0,
  sick: 0,
  vacation: 0,
  overtime: 0,
  ...overrides,
})

describe('review timesheet presentation', () => {
  it('hides dates whose calculated daily total is zero', () => {
    const entries = [
      entry('2026-08-01'),
      entry('2026-08-02', { regular: '8' }),
    ]

    expect(getNonzeroReviewEntries(entries).map(({ entryDate }) => entryDate))
      .toEqual(['2026-08-02'])
  })

  it('shows only Regular when it is the only nonzero daily category', () => {
    const dailyHours = draftToHours(
      entry('2026-08-03', { regular: '8' }),
    )

    expect(getNonzeroHourCategories(dailyHours)).toEqual(['regular'])
    expect(calculateDailyTotal(dailyHours)).toBe(8)
  })

  it('shows each nonzero category and preserves the daily total', () => {
    const dailyHours = draftToHours(
      entry('2026-08-04', { regular: '6', vacation: '2', overtime: '1.5' }),
    )

    expect(getNonzeroHourCategories(dailyHours)).toEqual([
      'regular',
      'vacation',
      'overtime',
    ])
    expect(calculateDailyTotal(dailyHours)).toBe(9.5)
  })

  it('omits zero period categories while preserving category and grand totals', () => {
    const totals = calculatePeriodTotals([
      hours({ regular: 8 }),
      hours({ regular: 6, vacation: 2, overtime: 1.5 }),
    ])

    expect(getNonzeroHourCategories(totals)).toEqual([
      'regular',
      'vacation',
      'overtime',
    ])
    expect(totals).toEqual({
      regular: 14,
      holiday: 0,
      sick: 0,
      vacation: 2,
      overtime: 1.5,
      grandTotal: 17.5,
    })
  })

  it('does not remove dates or fields from editable entry data', () => {
    const zeroEntry = entry('2026-08-01')
    const entries = [
      zeroEntry,
      entry('2026-08-02', { regular: '8' }),
    ]

    getNonzeroReviewEntries(entries)

    expect(entries).toHaveLength(2)
    expect(Object.keys(zeroEntry)).toEqual(['entryDate', ...hourCategories])
    expect(zeroEntry).toEqual(entry('2026-08-01'))
  })
})
