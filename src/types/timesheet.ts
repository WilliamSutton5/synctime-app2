export type Language = 'en' | 'es'

export type PayPeriod = 'first_half' | 'second_half'

export type TimesheetStatus = 'draft' | 'finalized'

export const hourCategories = [
  'regular',
  'holiday',
  'sick',
  'vacation',
  'overtime',
] as const

export type HourCategory = (typeof hourCategories)[number]

export type Hours = Record<HourCategory, number>

export type HourInputs = Record<HourCategory, string>

export interface PeriodSelection {
  year: number
  month: number
  payPeriod: PayPeriod
}

export interface Profile {
  id: string
  fullName: string
  createdAt: string
  updatedAt: string
}

export interface Timesheet {
  id: string
  employeeId: string
  year: number
  month: number
  payPeriod: PayPeriod
  status: TimesheetStatus
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TimeEntry extends Hours {
  id?: string
  timesheetId?: string
  entryDate: string
}

export interface EntryDraft extends HourInputs {
  entryDate: string
}

export type EntryDraftMap = Record<string, EntryDraft>

export interface PeriodTotals extends Hours {
  grandTotal: number
}
