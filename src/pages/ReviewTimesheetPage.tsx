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
  onSubmit,
}: {
  employeeName: string
  selection: PeriodSelection
  drafts: EntryDraftMap
  timesheet: Timesheet | null
  onBack: () => void
  onSubmit: () => Promise<void>
}) {
  const { t } = useI18n()
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!confirmed) {
      setError(t('confirmationRequired'))
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit()
    } catch {
      setError(t('submitError'))
      setIsSubmitting(false)
    }
  }

  return (
    <main className="workspace-main review-page">
      <div className="page-heading no-print">
        <div>
          <p className="eyebrow">{t('reviewAndSubmit')}</p>
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
            disabled={isSubmitting}
            onClick={onBack}
          >
            {t('backToEdit')}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? t('submitting') : t('confirmSubmission')}
          </button>
        </div>
      </section>
    </main>
  )
}
