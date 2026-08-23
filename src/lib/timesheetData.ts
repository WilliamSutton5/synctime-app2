import type { Database } from '../types/database'
import type {
  EntryDraftMap,
  PeriodSelection,
  Profile,
  TimeEntry,
  Timesheet,
} from '../types/timesheet'
import { draftsToEntries } from './timesheetCalculations'
import { getSupabaseClient } from './supabase'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type TimesheetRow = Database['public']['Tables']['timesheets']['Row']
type TimeEntryRow = Database['public']['Tables']['time_entries']['Row']

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTimesheet(row: TimesheetRow): Timesheet {
  return {
    id: row.id,
    userId: row.user_id,
    year: row.year,
    month: row.month,
    payPeriod: row.pay_period,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    timesheetId: row.timesheet_id,
    entryDate: row.entry_date,
    regular: Number(row.regular_hours),
    holiday: Number(row.holiday_hours),
    sick: Number(row.sick_hours),
    vacation: Number(row.vacation_hours),
    overtime: Number(row.overtime_hours),
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function saveProfile(
  userId: string,
  fullName: string,
): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert({ id: userId, full_name: fullName }, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return mapProfile(data)
}

export interface LoadedTimesheet {
  timesheet: Timesheet
  entries: TimeEntry[]
}

export interface TimesheetDataSource {
  loadTimesheet: (
    userId: string,
    selection: PeriodSelection,
  ) => Promise<LoadedTimesheet | null>
  saveDraft: (
    userId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ) => Promise<LoadedTimesheet>
  submitTimesheet: (
    userId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ) => Promise<LoadedTimesheet>
}

export async function loadTimesheet(
  userId: string,
  selection: PeriodSelection,
): Promise<LoadedTimesheet | null> {
  const client = getSupabaseClient()
  const { data: timesheetRow, error: timesheetError } = await client
    .from('timesheets')
    .select('*')
    .eq('user_id', userId)
    .eq('year', selection.year)
    .eq('month', selection.month)
    .eq('pay_period', selection.payPeriod)
    .maybeSingle()

  if (timesheetError) throw timesheetError
  if (!timesheetRow) return null

  const { data: entryRows, error: entryError } = await client
    .from('time_entries')
    .select('*')
    .eq('timesheet_id', timesheetRow.id)
    .order('entry_date')

  if (entryError) throw entryError

  return {
    timesheet: mapTimesheet(timesheetRow),
    entries: entryRows.map(mapTimeEntry),
  }
}

export async function saveDraft(
  userId: string,
  selection: PeriodSelection,
  drafts: EntryDraftMap,
): Promise<LoadedTimesheet> {
  const client = getSupabaseClient()
  const { data: timesheetRow, error: timesheetError } = await client
    .from('timesheets')
    .upsert(
      {
        user_id: userId,
        year: selection.year,
        month: selection.month,
        pay_period: selection.payPeriod,
        status: 'draft',
        submitted_at: null,
      },
      { onConflict: 'user_id,year,month,pay_period' },
    )
    .select()
    .single()

  if (timesheetError) throw timesheetError

  const entryPayload = draftsToEntries(drafts).map((entry) => ({
    timesheet_id: timesheetRow.id,
    entry_date: entry.entryDate,
    regular_hours: entry.regular,
    holiday_hours: entry.holiday,
    sick_hours: entry.sick,
    vacation_hours: entry.vacation,
    overtime_hours: entry.overtime,
  }))

  const { data: entryRows, error: entryError } = await client
    .from('time_entries')
    .upsert(entryPayload, { onConflict: 'timesheet_id,entry_date' })
    .select()

  if (entryError) throw entryError

  return {
    timesheet: mapTimesheet(timesheetRow),
    entries: entryRows.map(mapTimeEntry),
  }
}

export async function submitTimesheet(
  userId: string,
  selection: PeriodSelection,
  drafts: EntryDraftMap,
): Promise<LoadedTimesheet> {
  const saved = await saveDraft(userId, selection, drafts)
  const { data, error } = await getSupabaseClient()
    .from('timesheets')
    .update({ status: 'submitted' })
    .eq('id', saved.timesheet.id)
    .select()
    .single()

  if (error) throw error

  return {
    timesheet: mapTimesheet(data),
    entries: saved.entries,
  }
}

export const supabaseTimesheetDataSource: TimesheetDataSource = {
  loadTimesheet,
  saveDraft,
  submitTimesheet,
}
