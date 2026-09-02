import type {
  EntryDraftMap,
  PeriodSelection,
  Profile,
  TimeEntry,
  Timesheet,
} from '../types/timesheet'
import { draftsToEntries } from './timesheetCalculations'

const PROFILE_STORAGE_KEY = 'synctime-profile-v1'
const TIMESHEETS_STORAGE_KEY = 'synctime-timesheets-v1'
const LOCAL_EMPLOYEE_ID = 'local-employee'

export interface LoadedTimesheet {
  timesheet: Timesheet
  entries: TimeEntry[]
}

export interface TimesheetDataSource {
  loadTimesheet: (
    employeeId: string,
    selection: PeriodSelection,
  ) => Promise<LoadedTimesheet | null>
  saveDraft: (
    employeeId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ) => Promise<LoadedTimesheet>
  finalizeTimesheet: (
    employeeId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ) => Promise<LoadedTimesheet>
}

type TimesheetStore = Record<string, LoadedTimesheet>

function browserStorage(): Storage {
  return window.localStorage
}

function cloneLoadedTimesheet(value: LoadedTimesheet): LoadedTimesheet {
  return {
    timesheet: { ...value.timesheet },
    entries: value.entries.map((entry) => ({ ...entry })),
  }
}

function readJson(storage: Storage, key: string): unknown {
  const value = storage.getItem(key)
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  return (
    profile.id === LOCAL_EMPLOYEE_ID &&
    typeof profile.fullName === 'string' &&
    profile.fullName.trim().length >= 2 &&
    typeof profile.createdAt === 'string' &&
    typeof profile.updatedAt === 'string'
  )
}

function readTimesheetStore(storage: Storage): TimesheetStore {
  const value = readJson(storage, TIMESHEETS_STORAGE_KEY)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as TimesheetStore
}

function selectionKey(employeeId: string, selection: PeriodSelection): string {
  return [
    employeeId,
    selection.year,
    selection.month,
    selection.payPeriod,
  ].join(':')
}

function createTimesheetId(
  employeeId: string,
  selection: PeriodSelection,
): string {
  return `local-${selectionKey(employeeId, selection)}`
}

export function loadLocalProfile(
  storage: Storage = browserStorage(),
): Profile | null {
  const value = readJson(storage, PROFILE_STORAGE_KEY)
  return isProfile(value) ? { ...value } : null
}

export function saveLocalProfile(
  fullName: string,
  existingProfile: Profile | null = null,
  storage: Storage = browserStorage(),
  now: () => Date = () => new Date(),
): Profile {
  const normalizedName = fullName.trim()
  if (normalizedName.length < 2) {
    throw new Error('Employee name must contain at least two characters.')
  }

  const timestamp = now().toISOString()
  const profile: Profile = {
    id: LOCAL_EMPLOYEE_ID,
    fullName: normalizedName,
    createdAt: existingProfile?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  return profile
}

export function createLocalTimesheetDataSource(
  storage: Storage = browserStorage(),
  now: () => Date = () => new Date(),
): TimesheetDataSource {
  async function loadTimesheet(
    employeeId: string,
    selection: PeriodSelection,
  ): Promise<LoadedTimesheet | null> {
    const stored =
      readTimesheetStore(storage)[selectionKey(employeeId, selection)]
    return stored ? cloneLoadedTimesheet(stored) : null
  }

  async function saveDraft(
    employeeId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ): Promise<LoadedTimesheet> {
    const store = readTimesheetStore(storage)
    const key = selectionKey(employeeId, selection)
    const existing = store[key]
    const timestamp = now().toISOString()
    const timesheetId =
      existing?.timesheet.id ?? createTimesheetId(employeeId, selection)
    const saved: LoadedTimesheet = {
      timesheet: {
        id: timesheetId,
        employeeId,
        year: selection.year,
        month: selection.month,
        payPeriod: selection.payPeriod,
        status: 'draft',
        finalizedAt: null,
        createdAt: existing?.timesheet.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
      entries: draftsToEntries(drafts).map((entry, index) => ({
        ...entry,
        id: `${timesheetId}-entry-${index + 1}`,
        timesheetId,
      })),
    }

    store[key] = saved
    storage.setItem(TIMESHEETS_STORAGE_KEY, JSON.stringify(store))
    return cloneLoadedTimesheet(saved)
  }

  async function finalizeTimesheet(
    employeeId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ): Promise<LoadedTimesheet> {
    const saved = await saveDraft(employeeId, selection, drafts)
    const timestamp = now().toISOString()
    const finalized: LoadedTimesheet = {
      timesheet: {
        ...saved.timesheet,
        status: 'finalized',
        finalizedAt: timestamp,
        updatedAt: timestamp,
      },
      entries: saved.entries,
    }
    const store = readTimesheetStore(storage)
    store[selectionKey(employeeId, selection)] = finalized
    storage.setItem(TIMESHEETS_STORAGE_KEY, JSON.stringify(store))
    return cloneLoadedTimesheet(finalized)
  }

  return { loadTimesheet, saveDraft, finalizeTimesheet }
}

export const localTimesheetDataSource: TimesheetDataSource = {
  loadTimesheet(employeeId, selection) {
    return createLocalTimesheetDataSource().loadTimesheet(employeeId, selection)
  },
  saveDraft(employeeId, selection, drafts) {
    return createLocalTimesheetDataSource().saveDraft(
      employeeId,
      selection,
      drafts,
    )
  },
  finalizeTimesheet(employeeId, selection, drafts) {
    return createLocalTimesheetDataSource().finalizeTimesheet(
      employeeId,
      selection,
      drafts,
    )
  },
}
