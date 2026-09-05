import type { Language, PayPeriod, PeriodSelection } from '../types/timesheet'

export const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1)

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

export function getPayPeriodDates(
  year: number,
  month: number,
  payPeriod: PayPeriod,
): string[] {
  const firstDay = payPeriod === 'first_half' ? 1 : 16
  const finalDay =
    payPeriod === 'first_half' ? 15 : getDaysInMonth(year, month)

  return Array.from({ length: finalDay - firstDay + 1 }, (_, index) =>
    toIsoDate(year, month, firstDay + index),
  )
}

export function getCurrentPeriod(date = new Date()): PeriodSelection {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    payPeriod: date.getDate() <= 15 ? 'first_half' : 'second_half',
  }
}

export function formatEntryDate(isoDate: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseIsoDate(isoDate))
}

export function formatShortDate(isoDate: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parseIsoDate(isoDate))
}

export function formatCompactWeekdayDate(
  isoDate: string,
  language: Language,
): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parseIsoDate(isoDate))
}

export function formatMonth(month: number, language: Language): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    month: 'long',
  }).format(new Date(2024, month - 1, 1))
}

export function formatPeriodRange(
  selection: PeriodSelection,
  language: Language,
): string {
  const dates = getPayPeriodDates(
    selection.year,
    selection.month,
    selection.payPeriod,
  )
  const firstDate = dates[0]
  const lastDate = dates.at(-1)

  if (!firstDate || !lastDate) return ''

  const locale = language === 'es' ? 'es-US' : 'en-US'
  const start = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
  }).format(parseIsoDate(firstDate))
  const end = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseIsoDate(lastDate))

  return `${start} – ${end}`
}

export function formatDateTime(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function isWeekend(isoDate: string): boolean {
  const day = parseIsoDate(isoDate).getDay()
  return day === 0 || day === 6
}
