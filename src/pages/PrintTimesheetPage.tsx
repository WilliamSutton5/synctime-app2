import { TimesheetDocument } from '../components/TimesheetDocument'
import { useI18n } from '../i18n/I18nProvider'
import type {
  EntryDraftMap,
  PeriodSelection,
  Timesheet,
} from '../types/timesheet'

export function PrintTimesheetPage({
  employeeName,
  selection,
  drafts,
  timesheet,
  onBack,
}: {
  employeeName: string
  selection: PeriodSelection
  drafts: EntryDraftMap
  timesheet: Timesheet
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <main className="workspace-main print-page">
      <div className="page-heading no-print">
        <div>
          <p className="eyebrow">{t('finalized')}</p>
          <h1>{t('printTitle')}</h1>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={onBack}>
            {t('backToTimesheet')}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => window.print()}
          >
            {t('printSavePdf')}
          </button>
        </div>
      </div>
      <TimesheetDocument
        employeeName={employeeName}
        selection={selection}
        drafts={drafts}
        timesheet={timesheet}
      />
    </main>
  )
}
