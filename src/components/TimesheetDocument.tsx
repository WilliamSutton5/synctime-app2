import { useI18n } from '../i18n/I18nProvider'
import {
  formatDateTime,
  formatPeriodRange,
  formatReviewDate,
  formatShortDate,
} from '../lib/dates'
import {
  calculateDailyTotal,
  calculatePeriodTotals,
  draftToHours,
  formatHours,
} from '../lib/timesheetCalculations'
import {
  getNonzeroHourCategories,
  getNonzeroReviewEntries,
} from '../lib/timesheetReview'
import {
  hourCategories,
  type EntryDraftMap,
  type PeriodSelection,
  type Timesheet,
} from '../types/timesheet'
import { TimesheetSummary } from './TimesheetSummary'

export function TimesheetDocument({
  employeeName,
  selection,
  drafts,
  timesheet,
  conciseReview = false,
}: {
  employeeName: string
  selection: PeriodSelection
  drafts: EntryDraftMap
  timesheet: Timesheet | null
  conciseReview?: boolean
}) {
  const { language, t } = useI18n()
  const entries = Object.values(drafts)
  const reviewEntries = conciseReview
    ? getNonzeroReviewEntries(entries)
    : entries
  const totals = calculatePeriodTotals(entries.map(draftToHours))

  return (
    <article className="timesheet-document">
      <header className="document-header print-only">
        <div>
          <p className="eyebrow">SyncTime</p>
          <h1>{t('printTitle')}</h1>
        </div>
        <div className="print-wordmark" aria-hidden="true">ST</div>
      </header>

      <dl className="document-meta">
        <div>
          <dt>{t('employee')}</dt>
          <dd>{employeeName}</dd>
        </div>
        <div>
          <dt>{t('payPeriod')}</dt>
          <dd>{formatPeriodRange(selection, language)}</dd>
        </div>
        <div>
          <dt>{t('status')}</dt>
          <dd>{t(timesheet?.status ?? 'draft')}</dd>
        </div>
        {timesheet?.finalizedAt ? (
          <div>
            <dt>{t('finalizationDate')}</dt>
            <dd>{formatDateTime(timesheet.finalizedAt, language)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="review-entry-list">
        {reviewEntries.map((entry) => {
          const hours = draftToHours(entry)
          const visibleCategories = conciseReview
            ? getNonzeroHourCategories(hours)
            : hourCategories
          return (
            <section className="review-entry" key={entry.entryDate}>
              <div className="review-entry__date">
                <strong>
                  {conciseReview
                    ? formatReviewDate(entry.entryDate, language)
                    : formatShortDate(entry.entryDate, language)}
                </strong>
                <span>
                  {formatHours(calculateDailyTotal(hours))} {t('hoursShort')}
                </span>
              </div>
              <dl>
                {visibleCategories.map((category) => (
                  <div
                    key={category}
                    className={hours[category] === 0 ? 'is-zero' : ''}
                  >
                    <dt>{t(category)}</dt>
                    <dd>{formatHours(hours[category])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>

      <table className="print-table print-only">
        <thead>
          <tr>
            <th>{t('date')}</th>
            {hourCategories.map((category) => (
              <th key={category}>{t(category)}</th>
            ))}
            <th>{t('total')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hours = draftToHours(entry)
            return (
              <tr key={entry.entryDate}>
                <th>{formatShortDate(entry.entryDate, language)}</th>
                {hourCategories.map((category) => (
                  <td key={category}>{formatHours(hours[category])}</td>
                ))}
                <td>{formatHours(calculateDailyTotal(hours))}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th>{t('total')}</th>
            {hourCategories.map((category) => (
              <td key={category}>{formatHours(totals[category])}</td>
            ))}
            <td>{formatHours(totals.grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="screen-only">
        <TimesheetSummary
          totals={totals}
          omitZeroCategories={conciseReview}
        />
      </div>
    </article>
  )
}
