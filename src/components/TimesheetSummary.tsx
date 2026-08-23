import { useI18n } from '../i18n/I18nProvider'
import { formatHours } from '../lib/timesheetCalculations'
import { getNonzeroHourCategories } from '../lib/timesheetReview'
import { hourCategories, type PeriodTotals } from '../types/timesheet'

export function TimesheetSummary({
  totals,
  omitZeroCategories = false,
}: {
  totals: PeriodTotals
  omitZeroCategories?: boolean
}) {
  const { t } = useI18n()
  const visibleCategories = omitZeroCategories
    ? getNonzeroHourCategories(totals)
    : hourCategories

  return (
    <section className="summary-card" aria-labelledby="period-summary-title">
      <div className="section-heading">
        <p className="eyebrow">{t('payPeriod')}</p>
        <h2 id="period-summary-title">{t('periodSummary')}</h2>
      </div>
      <dl className="totals-grid">
        {visibleCategories.map((category) => (
          <div key={category}>
            <dt>{t(category)}</dt>
            <dd>{formatHours(totals[category])}</dd>
          </div>
        ))}
        <div className="totals-grid__grand">
          <dt>{t('total')}</dt>
          <dd>
            {formatHours(totals.grandTotal)} <small>{t('hoursShort')}</small>
          </dd>
        </div>
      </dl>
    </section>
  )
}
