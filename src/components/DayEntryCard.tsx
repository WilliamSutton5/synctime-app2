import { useI18n } from '../i18n/I18nProvider'
import { formatEntryDate, isWeekend } from '../lib/dates'
import {
  calculateDailyTotal,
  draftToHours,
  formatHours,
} from '../lib/timesheetCalculations'
import {
  hourCategories,
  type EntryDraft,
  type HourCategory,
} from '../types/timesheet'

const validHourInput = /^\d*(?:\.\d*)?$/

export function DayEntryCard({
  entry,
  disabled,
  onChange,
}: {
  entry: EntryDraft
  disabled: boolean
  onChange: (category: HourCategory, value: string) => void
}) {
  const { language, t } = useI18n()
  const total = calculateDailyTotal(draftToHours(entry))
  const formattedDate = formatEntryDate(entry.entryDate, language)

  function handleChange(category: HourCategory, value: string) {
    if (value === '' || (validHourInput.test(value) && Number(value) >= 0)) {
      onChange(category, value)
    }
  }

  return (
    <section
      className={`day-card${isWeekend(entry.entryDate) ? ' day-card--weekend' : ''}`}
      aria-labelledby={`date-${entry.entryDate}`}
    >
      <header className="day-card__header">
        <h3 id={`date-${entry.entryDate}`}>{formattedDate}</h3>
        <p>
          <span>{t('dailyTotal')}</span>
          <strong>{formatHours(total)}</strong>
          <small>{t('hoursShort')}</small>
        </p>
      </header>
      <div className="hour-input-grid">
        {hourCategories.map((category) => (
          <label key={category} className={`hour-field hour-field--${category}`}>
            <span>{t(category)}</span>
            <input
              type="number"
              min="0"
              step="0.25"
              inputMode="decimal"
              placeholder="0"
              value={entry[category]}
              disabled={disabled}
              aria-label={`${t(category)}, ${formattedDate}`}
              onChange={(event) => handleChange(category, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  )
}
