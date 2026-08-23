import { describe, expect, it } from 'vitest'
import { getCurrentPeriod } from '../lib/dates'
import { mergeEntriesIntoDraftMap } from '../lib/timesheetCalculations'
import { createDemoTimesheetDataSource, demoProfile } from './demoData'

describe('local demo data source', () => {
  const now = new Date(2026, 7, 18, 10, 30)
  const currentSelection = getCurrentPeriod(now)

  it('loads realistic editable data for the current period', async () => {
    const source = createDemoTimesheetDataSource(now, 0)
    const loaded = await source.loadTimesheet(demoProfile.id, currentSelection)

    expect(loaded?.timesheet.status).toBe('draft')
    expect(loaded?.entries.some((entry) => entry.regular > 0)).toBe(true)
    expect(loaded?.entries.some((entry) => entry.vacation > 0)).toBe(true)
  })

  it('loads the previous period as a submitted example', async () => {
    const source = createDemoTimesheetDataSource(now, 0)
    const previousSelection = { ...currentSelection, payPeriod: 'first_half' as const }
    const loaded = await source.loadTimesheet(demoProfile.id, previousSelection)

    expect(loaded?.timesheet.status).toBe('submitted')
    expect(loaded?.timesheet.submittedAt).not.toBeNull()
  })

  it('saves edits in memory and supports the submission flow', async () => {
    const source = createDemoTimesheetDataSource(now, 0)
    const loaded = await source.loadTimesheet(demoProfile.id, currentSelection)
    expect(loaded).not.toBeNull()
    if (!loaded) return

    const dates = loaded.entries.map((entry) => entry.entryDate)
    const drafts = mergeEntriesIntoDraftMap(dates, loaded.entries)
    const firstDate = dates[0]
    expect(firstDate).toBeDefined()
    if (!firstDate) return
    drafts[firstDate] = { ...drafts[firstDate]!, regular: '6.5' }

    await source.saveDraft(demoProfile.id, currentSelection, drafts)
    const submitted = await source.submitTimesheet(
      demoProfile.id,
      currentSelection,
      drafts,
    )
    const reloaded = await source.loadTimesheet(demoProfile.id, currentSelection)

    expect(submitted.timesheet.status).toBe('submitted')
    expect(submitted.timesheet.submittedAt).not.toBeNull()
    expect(reloaded?.entries[0]?.regular).toBe(6.5)
  })
})
