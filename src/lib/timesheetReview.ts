import {
  hourCategories,
  type EntryDraft,
  type HourCategory,
  type Hours,
} from '../types/timesheet'
import { calculateDailyTotal, draftToHours } from './timesheetCalculations'

export function getNonzeroHourCategories(hours: Hours): HourCategory[] {
  return hourCategories.filter((category) => hours[category] > 0)
}

export function getNonzeroReviewEntries(entries: EntryDraft[]): EntryDraft[] {
  return entries.filter(
    (entry) => calculateDailyTotal(draftToHours(entry)) > 0,
  )
}
