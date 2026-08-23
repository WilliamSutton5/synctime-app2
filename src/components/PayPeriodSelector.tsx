import { useI18n } from '../i18n/I18nProvider'
import { formatMonth, MONTH_NUMBERS } from '../lib/dates'
import type { PayPeriod, PeriodSelection } from '../types/timesheet'

export function PayPeriodSelector({
  selection,
  disabled = false,
  onChange,
}: {
  selection: PeriodSelection
  disabled?: boolean
  onChange: (selection: PeriodSelection) => void
}) {
  const { language, t } = useI18n()
  const yearOptions = Array.from({ length: 101 }, (_, index) => 2000 + index)

  return (
    <fieldset className="period-selector" disabled={disabled}>
      <legend>{t('periodControls')}</legend>
      <label>
        <span>{t('year')}</span>
        <select
          value={selection.year}
          onChange={(event) =>
            onChange({ ...selection, year: Number(event.target.value) })
          }
        >
          {yearOptions.map((year) => (
            <option value={year} key={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('month')}</span>
        <select
          value={selection.month}
          onChange={(event) =>
            onChange({ ...selection, month: Number(event.target.value) })
          }
        >
          {MONTH_NUMBERS.map((month) => (
            <option value={month} key={month}>
              {formatMonth(month, language)}
            </option>
          ))}
        </select>
      </label>
      <label className="period-selector__period">
        <span>{t('payPeriod')}</span>
        <select
          value={selection.payPeriod}
          onChange={(event) =>
            onChange({
              ...selection,
              payPeriod: event.target.value as PayPeriod,
            })
          }
        >
          <option value="first_half">{t('firstHalf')}</option>
          <option value="second_half">{t('secondHalf')}</option>
        </select>
      </label>
    </fieldset>
  )
}
