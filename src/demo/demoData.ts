import { getCurrentPeriod, getPayPeriodDates, parseIsoDate } from '../lib/dates'
import type {
  LoadedTimesheet,
  TimesheetDataSource,
} from '../lib/timesheetData'
import { draftsToEntries, emptyHours } from '../lib/timesheetCalculations'
import type {
  EntryDraftMap,
  Hours,
  PeriodSelection,
  Profile,
  TimeEntry,
  Timesheet,
  TimesheetStatus,
} from '../types/timesheet'

const DEMO_USER_ID = 'demo-employee-maria-rodriguez'

export const demoProfile: Profile = {
  id: DEMO_USER_ID,
  fullName: 'María Rodriguez',
  createdAt: '2026-01-08T14:30:00.000Z',
  updatedAt: '2026-01-08T14:30:00.000Z',
}

function selectionKey(selection: PeriodSelection): string {
  return `${selection.year}-${selection.month}-${selection.payPeriod}`
}

function previousPeriod(selection: PeriodSelection): PeriodSelection {
  if (selection.payPeriod === 'second_half') {
    return { ...selection, payPeriod: 'first_half' }
  }

  const previousMonth = selection.month === 1 ? 12 : selection.month - 1
  return {
    year: selection.month === 1 ? selection.year - 1 : selection.year,
    month: previousMonth,
    payPeriod: 'second_half',
  }
}

function cloneLoadedTimesheet(value: LoadedTimesheet): LoadedTimesheet {
  return {
    timesheet: { ...value.timesheet },
    entries: value.entries.map((entry) => ({ ...entry })),
  }
}

function makeHours(overrides: Partial<Hours> = {}): Hours {
  return { ...emptyHours(), ...overrides }
}

function createRealisticEntries(
  selection: PeriodSelection,
  kind: 'in_progress' | 'complete',
  timesheetId: string,
): TimeEntry[] {
  let workdayIndex = 0

  return getPayPeriodDates(
    selection.year,
    selection.month,
    selection.payPeriod,
  ).map((entryDate, index) => {
    const weekday = parseIsoDate(entryDate).getDay()
    const isWeekend = weekday === 0 || weekday === 6
    let hours = makeHours()

    if (!isWeekend && (kind === 'complete' || workdayIndex < 7)) {
      if (kind === 'complete' && workdayIndex === 3) {
        hours = makeHours({ holiday: 8 })
      } else if (workdayIndex === 2) {
        hours = makeHours({ regular: 4, vacation: 4 })
      } else if (workdayIndex === 5) {
        hours = makeHours({ regular: 7.5, overtime: 0.5 })
      } else if (kind === 'in_progress' && workdayIndex === 6) {
        hours = makeHours({ regular: 4, sick: 4 })
      } else {
        hours = makeHours({ regular: 8 })
      }
      workdayIndex += 1
    }

    return {
      id: `${timesheetId}-entry-${index + 1}`,
      timesheetId,
      entryDate,
      ...hours,
    }
  })
}

function createSeededTimesheet(
  selection: PeriodSelection,
  status: TimesheetStatus,
  now: Date,
): LoadedTimesheet {
  const key = selectionKey(selection)
  const id = `demo-timesheet-${key}`
  const timestamp = now.toISOString()
  const submittedAt =
    status === 'submitted'
      ? new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
      : null
  const timesheet: Timesheet = {
    id,
    userId: DEMO_USER_ID,
    year: selection.year,
    month: selection.month,
    payPeriod: selection.payPeriod,
    status,
    submittedAt,
    createdAt: timestamp,
    updatedAt: submittedAt ?? timestamp,
  }

  return {
    timesheet,
    entries: createRealisticEntries(
      selection,
      status === 'submitted' ? 'complete' : 'in_progress',
      id,
    ),
  }
}

export function createDemoTimesheetDataSource(
  now = new Date(),
  latencyMs = 180,
): TimesheetDataSource {
  const currentSelection = getCurrentPeriod(now)
  const priorSelection = previousPeriod(currentSelection)
  const store = new Map<string, LoadedTimesheet>([
    [
      selectionKey(currentSelection),
      createSeededTimesheet(currentSelection, 'draft', now),
    ],
    [
      selectionKey(priorSelection),
      createSeededTimesheet(priorSelection, 'submitted', now),
    ],
  ])

  const wait = () =>
    latencyMs > 0
      ? new Promise<void>((resolve) => window.setTimeout(resolve, latencyMs))
      : Promise.resolve()

  function requireDemoUser(userId: string) {
    if (userId !== DEMO_USER_ID) {
      throw new Error('The local demo data source only accepts its mock employee.')
    }
  }

  async function loadTimesheet(
    userId: string,
    selection: PeriodSelection,
  ): Promise<LoadedTimesheet | null> {
    requireDemoUser(userId)
    await wait()
    const loaded = store.get(selectionKey(selection))
    return loaded ? cloneLoadedTimesheet(loaded) : null
  }

  async function saveDraft(
    userId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ): Promise<LoadedTimesheet> {
    requireDemoUser(userId)
    await wait()
    const key = selectionKey(selection)
    const existing = store.get(key)
    const timestamp = new Date().toISOString()
    const timesheetId = existing?.timesheet.id ?? `demo-timesheet-${key}`
    const saved: LoadedTimesheet = {
      timesheet: {
        id: timesheetId,
        userId,
        year: selection.year,
        month: selection.month,
        payPeriod: selection.payPeriod,
        status: 'draft',
        submittedAt: null,
        createdAt: existing?.timesheet.createdAt ?? timestamp,
        updatedAt: timestamp,
      },
      entries: draftsToEntries(drafts).map((entry, index) => ({
        ...entry,
        id: `${timesheetId}-entry-${index + 1}`,
        timesheetId,
      })),
    }
    store.set(key, saved)
    return cloneLoadedTimesheet(saved)
  }

  async function submitTimesheet(
    userId: string,
    selection: PeriodSelection,
    drafts: EntryDraftMap,
  ): Promise<LoadedTimesheet> {
    const saved = await saveDraft(userId, selection, drafts)
    await wait()
    const timestamp = new Date().toISOString()
    const submitted: LoadedTimesheet = {
      timesheet: {
        ...saved.timesheet,
        status: 'submitted',
        submittedAt: timestamp,
        updatedAt: timestamp,
      },
      entries: saved.entries,
    }
    store.set(selectionKey(selection), submitted)
    return cloneLoadedTimesheet(submitted)
  }

  return { loadTimesheet, saveDraft, submitTimesheet }
}
