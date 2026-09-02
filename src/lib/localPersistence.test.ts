import { describe, expect, it } from 'vitest'
import type { PeriodSelection } from '../types/timesheet'
import { getPayPeriodDates } from './dates'
import {
  createLocalTimesheetDataSource,
  loadLocalProfile,
  saveLocalProfile,
} from './localPersistence'
import { createEmptyDraftMap } from './timesheetCalculations'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const firstHalf: PeriodSelection = {
  year: 2026,
  month: 9,
  payPeriod: 'first_half',
}

const secondHalf: PeriodSelection = {
  ...firstHalf,
  payPeriod: 'second_half',
}

function draftsFor(selection: PeriodSelection, regularHours: string) {
  const dates = getPayPeriodDates(
    selection.year,
    selection.month,
    selection.payPeriod,
  )
  const drafts = createEmptyDraftMap(dates)
  const firstDate = dates[0]
  if (firstDate) drafts[firstDate] = { ...drafts[firstDate]!, regular: regularHours }
  return drafts
}

describe('local employee profile persistence', () => {
  it('returns no profile on first use, then restores the saved name', () => {
    const storage = new MemoryStorage()
    expect(loadLocalProfile(storage)).toBeNull()

    saveLocalProfile(
      '  Elena Rivera  ',
      null,
      storage,
      () => new Date('2026-09-01T12:00:00Z'),
    )

    expect(loadLocalProfile(storage)).toEqual({
      id: 'local-employee',
      fullName: 'Elena Rivera',
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    })
  })

  it('changes the employee name without changing the local identity', () => {
    const storage = new MemoryStorage()
    const original = saveLocalProfile('Elena Rivera', null, storage)
    const updated = saveLocalProfile(
      'Elena Morales',
      original,
      storage,
      () => new Date('2026-09-02T12:00:00Z'),
    )

    expect(updated.id).toBe(original.id)
    expect(updated.createdAt).toBe(original.createdAt)
    expect(loadLocalProfile(storage)?.fullName).toBe('Elena Morales')
  })
})

describe('local timesheet persistence', () => {
  it('restores a saved draft after a simulated application restart', async () => {
    const storage = new MemoryStorage()
    const firstSource = createLocalTimesheetDataSource(storage)
    await firstSource.saveDraft(
      'local-employee',
      firstHalf,
      draftsFor(firstHalf, '7.5'),
    )

    const restartedSource = createLocalTimesheetDataSource(storage)
    const restored = await restartedSource.loadTimesheet(
      'local-employee',
      firstHalf,
    )

    expect(restored?.timesheet.status).toBe('draft')
    expect(restored?.entries[0]?.regular).toBe(7.5)
  })

  it('keeps different pay periods separate', async () => {
    const storage = new MemoryStorage()
    const source = createLocalTimesheetDataSource(storage)
    await source.saveDraft(
      'local-employee',
      firstHalf,
      draftsFor(firstHalf, '8'),
    )
    await source.saveDraft(
      'local-employee',
      secondHalf,
      draftsFor(secondHalf, '4'),
    )

    const first = await source.loadTimesheet('local-employee', firstHalf)
    const second = await source.loadTimesheet('local-employee', secondHalf)

    expect(first?.entries[0]?.regular).toBe(8)
    expect(second?.entries[0]?.regular).toBe(4)
  })

  it('finalizes, returns an edited sheet to draft, and re-finalizes it', async () => {
    const storage = new MemoryStorage()
    let now = new Date('2026-09-02T10:00:00Z')
    const source = createLocalTimesheetDataSource(storage, () => now)
    const drafts = draftsFor(firstHalf, '8')

    const finalized = await source.finalizeTimesheet(
      'local-employee',
      firstHalf,
      drafts,
    )
    expect(finalized.timesheet.status).toBe('finalized')
    expect(finalized.timesheet.finalizedAt).toBe('2026-09-02T10:00:00.000Z')

    const finalizedAfterRestart = await createLocalTimesheetDataSource(
      storage,
      () => now,
    ).loadTimesheet('local-employee', firstHalf)
    expect(finalizedAfterRestart?.timesheet.status).toBe('finalized')
    expect(finalizedAfterRestart?.timesheet.finalizedAt).toBe(
      '2026-09-02T10:00:00.000Z',
    )

    const editedDrafts = draftsFor(firstHalf, '7')
    const edited = await source.saveDraft(
      'local-employee',
      firstHalf,
      editedDrafts,
    )
    expect(edited.timesheet.status).toBe('draft')
    expect(edited.timesheet.finalizedAt).toBeNull()

    now = new Date('2026-09-02T11:00:00Z')
    const refinalized = await source.finalizeTimesheet(
      'local-employee',
      firstHalf,
      editedDrafts,
    )
    expect(refinalized.timesheet.status).toBe('finalized')
    expect(refinalized.timesheet.finalizedAt).toBe(
      '2026-09-02T11:00:00.000Z',
    )
  })
})
