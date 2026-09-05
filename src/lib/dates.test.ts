import { describe, expect, it } from 'vitest'
import {
  formatCompactWeekdayDate,
  getCurrentPeriod,
  getDaysInMonth,
  getPayPeriodDates,
} from './dates'

describe('pay-period date logic', () => {
  it('includes a localized weekday in English compact dates', () => {
    expect(formatCompactWeekdayDate('2026-09-01', 'en')).toBe('Tue, Sep 1')
  })

  it('includes a localized weekday in Spanish compact dates', () => {
    expect(formatCompactWeekdayDate('2026-09-01', 'es')).toBe(
      'mar, 1 de sept',
    )
  })

  it('generates the first through fifteenth for the first half', () => {
    const dates = getPayPeriodDates(2026, 8, 'first_half')
    expect(dates).toHaveLength(15)
    expect(dates[0]).toBe('2026-08-01')
    expect(dates.at(-1)).toBe('2026-08-15')
  })

  it('generates the sixteenth through month end for the second half', () => {
    const dates = getPayPeriodDates(2026, 8, 'second_half')
    expect(dates).toHaveLength(16)
    expect(dates[0]).toBe('2026-08-16')
    expect(dates.at(-1)).toBe('2026-08-31')
  })

  it('handles common-year February', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28)
    expect(getPayPeriodDates(2026, 2, 'second_half')).toHaveLength(13)
  })

  it('handles leap-year February', () => {
    expect(getDaysInMonth(2028, 2)).toBe(29)
    expect(getPayPeriodDates(2028, 2, 'second_half')).toHaveLength(14)
  })

  it('handles 30- and 31-day months', () => {
    expect(getDaysInMonth(2026, 4)).toBe(30)
    expect(getDaysInMonth(2026, 7)).toBe(31)
  })

  it('detects each current pay period', () => {
    expect(getCurrentPeriod(new Date(2026, 7, 15))).toEqual({
      year: 2026,
      month: 8,
      payPeriod: 'first_half',
    })
    expect(getCurrentPeriod(new Date(2026, 7, 16))).toEqual({
      year: 2026,
      month: 8,
      payPeriod: 'second_half',
    })
  })
})
