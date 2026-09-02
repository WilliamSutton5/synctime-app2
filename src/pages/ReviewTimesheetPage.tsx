import { useState } from 'react'
import { Notice } from '../components/Notice'
import { TimesheetDocument } from '../components/TimesheetDocument'
import { useI18n } from '../i18n/I18nProvider'
import type {
  EntryDraftMap,
  PeriodSelection,
  Timesheet,
} from '../types/timesheet'

export function ReviewTimesheetPage({
  employeeName,
  selection,
  drafts,
  timesheet,
  onBack,
  onFinalize,
}: {
  employeeName: string
  selection: PeriodSelection
  drafts: EntryDraftMap
  timesheet: Timesheet | null
  onBack: () => void
  onFinalize: () => Promise<void>
}) {
  const { t } = useI18n()
  const [confirmed, setConfirmed] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState('')

  async function handleFinalize() {
    if (!confirmed) {
      setError(t('confirmationRequired'))
      return
    }
    setError('')
    setIsFinalizing(true)
    try {
      await onFinalize()
    } catch {
      setError(t('finalizeError'))
      setIsFinalizing(false)
    }
  }

  return (
    <main className="workspace-main review-page">
      <div className="page-heading no-print">
        <div>
          <p className="eyebrow">{t('reviewAndFinalize')}</p>
          <h1>{t('reviewTitle')}</h1>
          <p>{t('reviewDescription')}</p>
        </div>
      </div>

      <TimesheetDocument
        employeeName={employeeName}
        selection={selection}
        drafts={drafts}
        timesheet={timesheet}
        conciseReview
      />

      <section className="confirmation-card no-print">
        <label className="confirmation-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>{t('accuracyConfirmation')}</span>
        </label>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            disabled={isFinalizing}
            onClick={onBack}
          >
            {t('backToEdit')}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={isFinalizing}
            onClick={handleFinalize}
          >
            {isFinalizing ? t('finalizing') : t('confirmFinalization')}
          </button>
        </div>
      </section>
    </main>
  )
}
