import {
  hourCategories,
  type EntryDraft,
  type EntryDraftMap,
  type Hours,
  type PeriodTotals,
  type TimeEntry,
} from '../types/timesheet'

export const emptyHours = (): Hours => ({
  regular: 0,
  holiday: 0,
  sick: 0,
  vacation: 0,
  overtime: 0,
})

export const emptyHourInputs = () => ({
  regular: '',
  holiday: '',
  sick: '',
  vacation: '',
  overtime: '',
})

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateDailyTotal(hours: Hours): number {
  return roundHours(
    hourCategories.reduce((total, category) => total + hours[category], 0),
  )
}

export function calculatePeriodTotals(entries: Hours[]): PeriodTotals {
  const totals = entries.reduce<Hours>((runningTotals, entry) => {
    for (const category of hourCategories) {
      runningTotals[category] = roundHours(
        runningTotals[category] + entry[category],
      )
    }
    return runningTotals
  }, emptyHours())

  return {
    ...totals,
    grandTotal: calculateDailyTotal(totals),
  }
}

export function inputToNumber(value: string): number {
  if (value.trim() === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function draftToHours(draft: EntryDraft): Hours {
  return {
    regular: inputToNumber(draft.regular),
    holiday: inputToNumber(draft.holiday),
    sick: inputToNumber(draft.sick),
    vacation: inputToNumber(draft.vacation),
    overtime: inputToNumber(draft.overtime),
  }
}

export function entryToDraft(entry: TimeEntry): EntryDraft {
  const displayValue = (value: number) => (value === 0 ? '' : String(value))
  return {
    entryDate: entry.entryDate,
    regular: displayValue(entry.regular),
    holiday: displayValue(entry.holiday),
    sick: displayValue(entry.sick),
    vacation: displayValue(entry.vacation),
    overtime: displayValue(entry.overtime),
  }
}

export function createEmptyDraftMap(dates: string[]): EntryDraftMap {
  return Object.fromEntries(
    dates.map((entryDate) => [
      entryDate,
      { entryDate, ...emptyHourInputs() },
    ]),
  )
}

export function mergeEntriesIntoDraftMap(
  dates: string[],
  entries: TimeEntry[],
): EntryDraftMap {
  const result = createEmptyDraftMap(dates)
  for (const entry of entries) {
    if (result[entry.entryDate]) {
      result[entry.entryDate] = entryToDraft(entry)
    }
  }
  return result
}

export function draftsToEntries(drafts: EntryDraftMap): TimeEntry[] {
  return Object.values(drafts).map((draft) => ({
    entryDate: draft.entryDate,
    ...draftToHours(draft),
  }))
}

export function formatHours(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}
