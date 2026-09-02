import { useEffect, useMemo, useRef, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { DayEntryCard } from '../components/DayEntryCard'
import { LoadingState } from '../components/LoadingState'
import { Notice } from '../components/Notice'
import { PayPeriodSelector } from '../components/PayPeriodSelector'
import { TimesheetSummary } from '../components/TimesheetSummary'
import { useI18n } from '../i18n/I18nProvider'
import { formatDateTime, formatPeriodRange, getCurrentPeriod, getPayPeriodDates } from '../lib/dates'
import {
  localTimesheetDataSource,
  type TimesheetDataSource,
} from '../lib/localPersistence'
import {
  calculatePeriodTotals,
  createEmptyDraftMap,
  draftToHours,
  mergeEntriesIntoDraftMap,
} from '../lib/timesheetCalculations'
import type {
  EntryDraftMap,
  HourCategory,
  PeriodSelection,
  Profile,
  Timesheet,
} from '../types/timesheet'
import { FinalizationSuccessPage } from './FinalizationSuccessPage'
import { PrintTimesheetPage } from './PrintTimesheetPage'
import { ReviewTimesheetPage } from './ReviewTimesheetPage'

type WorkspaceView = 'edit' | 'review' | 'success' | 'print'

export function TimesheetPage({
  profile,
  onHeaderAction,
  headerActionLabel,
  dataSource = localTimesheetDataSource,
  demoMode = false,
}: {
  profile: Profile
  onHeaderAction: () => void
  headerActionLabel: string
  dataSource?: TimesheetDataSource
  demoMode?: boolean
}) {
  const { language, t } = useI18n()
  const [selection, setSelection] = useState<PeriodSelection>(getCurrentPeriod)
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null)
  const [drafts, setDrafts] = useState<EntryDraftMap>({})
  const [view, setView] = useState<WorkspaceView>('edit')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isEditingFinalized, setIsEditingFinalized] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const loadSequence = useRef(0)
  const savedDrafts = useRef<EntryDraftMap>({})
  const translationRef = useRef(t)

  useEffect(() => {
    translationRef.current = t
  }, [t])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [isDirty])

  const dates = useMemo(
    () => getPayPeriodDates(selection.year, selection.month, selection.payPeriod),
    [selection],
  )
  const orderedDrafts = useMemo(
    () => dates.map((date) => drafts[date]).filter((entry) => entry !== undefined),
    [dates, drafts],
  )
  const totals = useMemo(
    () => calculatePeriodTotals(orderedDrafts.map(draftToHours)),
    [orderedDrafts],
  )
  const isReadOnly = timesheet?.status === 'finalized' && !isEditingFinalized

  useEffect(() => {
    const sequence = ++loadSequence.current
    void Promise.resolve()
      .then(() => {
        if (sequence !== loadSequence.current) return null
        setIsLoading(true)
        setError('')
        setNotice('')
        setIsEditingFinalized(false)
        setTimesheet(null)
        return dataSource.loadTimesheet(profile.id, selection)
      })
      .then((loaded) => {
        if (sequence !== loadSequence.current) return
        if (loaded) {
          const loadedDrafts = mergeEntriesIntoDraftMap(dates, loaded.entries)
          setTimesheet(loaded.timesheet)
          setDrafts(loadedDrafts)
          savedDrafts.current = loadedDrafts
        } else {
          const emptyDrafts = createEmptyDraftMap(dates)
          setTimesheet(null)
          setDrafts(emptyDrafts)
          savedDrafts.current = emptyDrafts
        }
        setIsDirty(false)
      })
      .catch(() => {
        if (sequence !== loadSequence.current) return
        setError(translationRef.current('loadError'))
        const emptyDrafts = createEmptyDraftMap(dates)
        setDrafts(emptyDrafts)
        savedDrafts.current = emptyDrafts
      })
      .finally(() => {
        if (sequence === loadSequence.current) setIsLoading(false)
      })
  }, [dataSource, dates, profile.id, selection])

  function handleSelectionChange(nextSelection: PeriodSelection) {
    if (isDirty && !window.confirm(t('unsavedWarning'))) return
    setIsLoading(true)
    setTimesheet(null)
    setDrafts({})
    setView('edit')
    setSelection(nextSelection)
  }

  function handleHourChange(
    entryDate: string,
    category: HourCategory,
    value: string,
  ) {
    setDrafts((current) => {
      const entry = current[entryDate]
      if (!entry) return current
      return {
        ...current,
        [entryDate]: { ...entry, [category]: value },
      }
    })
    setNotice('')
    setError('')
    setIsDirty(true)
  }

  async function handleSave() {
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await dataSource.saveDraft(profile.id, selection, drafts)
      const savedEntryDrafts = mergeEntriesIntoDraftMap(dates, saved.entries)
      setTimesheet(saved.timesheet)
      setDrafts(savedEntryDrafts)
      savedDrafts.current = savedEntryDrafts
      setIsDirty(false)
      setIsEditingFinalized(false)
      setNotice(t('saved'))
    } catch {
      setError(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleFinalize() {
    try {
      const finalized = await dataSource.finalizeTimesheet(
        profile.id,
        selection,
        drafts,
      )
      const finalizedDrafts = mergeEntriesIntoDraftMap(dates, finalized.entries)
      setTimesheet(finalized.timesheet)
      setDrafts(finalizedDrafts)
      savedDrafts.current = finalizedDrafts
      setIsDirty(false)
      setIsEditingFinalized(false)
      setView('success')
    } catch (finalizationError) {
      try {
        const latest = await dataSource.loadTimesheet(profile.id, selection)
        if (latest) {
          const latestDrafts = mergeEntriesIntoDraftMap(dates, latest.entries)
          setTimesheet(latest.timesheet)
          setDrafts(latestDrafts)
          savedDrafts.current = latestDrafts
          setIsDirty(false)
          setIsEditingFinalized(false)
        }
      } catch {
        // The review screen already explains that finalization failed; keep the
        // employee's in-memory entries intact if the recovery read also fails.
      }
      throw finalizationError
    }
  }

  function handleHeaderAction() {
    const warning = demoMode ? t('restartDemoWarning') : t('unsavedWarning')
    if (isDirty && !window.confirm(warning)) return
    onHeaderAction()
  }

  function cancelFinalizedEditing() {
    if (isDirty && !window.confirm(t('unsavedWarning'))) return
    setIsEditingFinalized(false)
    setIsDirty(false)
    setDrafts(savedDrafts.current)
  }

  const header = (
    <>
      <AppHeader
        greeting={t('greeting', { name: profile.fullName })}
        actionLabel={headerActionLabel}
        onAction={handleHeaderAction}
      />
      {demoMode ? (
        <aside className="demo-banner no-print" aria-label={t('demoMode')}>
          <strong>{t('demoMode')}</strong>
          <span>{t('demoModeDescription')}</span>
        </aside>
      ) : null}
    </>
  )

  if (view === 'review') {
    return (
      <div className="workspace-layout">
        {header}
        <ReviewTimesheetPage
          employeeName={profile.fullName}
          selection={selection}
          drafts={drafts}
          timesheet={timesheet}
          onBack={() => setView('edit')}
          onFinalize={handleFinalize}
        />
      </div>
    )
  }

  if (view === 'success') {
    return (
      <div className="workspace-layout">
        {header}
        <FinalizationSuccessPage
          onPrint={() => setView('print')}
          onBack={() => setView('edit')}
        />
      </div>
    )
  }

  if (view === 'print' && timesheet) {
    return (
      <div className="workspace-layout">
        {header}
        <PrintTimesheetPage
          employeeName={profile.fullName}
          selection={selection}
          drafts={drafts}
          timesheet={timesheet}
          onBack={() => setView('edit')}
        />
      </div>
    )
  }

  return (
    <div className="workspace-layout">
      {header}
      <main className="workspace-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{formatPeriodRange(selection, language)}</p>
            <h1>{t('timesheetTitle')}</h1>
          </div>
          {timesheet ? (
            <div className={`status-badge status-badge--${timesheet.status}`}>
              {t(timesheet.status)}
            </div>
          ) : null}
        </div>

        <PayPeriodSelector
          selection={selection}
          disabled={isLoading || isSaving}
          onChange={handleSelectionChange}
        />

        {error ? <Notice kind="error">{error}</Notice> : null}
        {notice ? <Notice kind="success">{notice}</Notice> : null}
        {!timesheet && !isLoading ? <Notice>{t('newTimesheet')}</Notice> : null}
        {timesheet?.finalizedAt && !isEditingFinalized ? (
          <Notice kind="success">
            {t('finalizedOn', {
              date: formatDateTime(timesheet.finalizedAt, language),
            })}
          </Notice>
        ) : null}
        {isEditingFinalized ? (
          <Notice>
            <strong>{t('editingNotice')}</strong> {t('editExplanation')}
          </Notice>
        ) : null}

        {isLoading ? (
          <LoadingState message={t('loadingTimesheet')} />
        ) : (
          <>
            {isReadOnly ? (
              <section className="finalized-actions">
                <p>{t('finalizedReadOnly')}</p>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setIsEditingFinalized(true)}
                  >
                    {t('editFinalized')}
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => setView('print')}
                  >
                    {t('printSavePdf')}
                  </button>
                </div>
              </section>
            ) : null}

            <div className="day-list">
              {orderedDrafts.map((entry) => (
                <DayEntryCard
                  key={entry.entryDate}
                  entry={entry}
                  disabled={isReadOnly || isSaving}
                  onChange={(category, value) =>
                    handleHourChange(entry.entryDate, category, value)
                  }
                />
              ))}
            </div>

            <TimesheetSummary totals={totals} />

            {!isReadOnly ? (
              <div className="action-bar no-print">
                {isEditingFinalized ? (
                  <button
                    className="text-button"
                    type="button"
                    disabled={isSaving}
                    onClick={cancelFinalizedEditing}
                  >
                    {t('cancelEditing')}
                  </button>
                ) : null}
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving ? t('saving') : t('save')}
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => setView('review')}
                >
                  {t('reviewAndFinalize')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}
