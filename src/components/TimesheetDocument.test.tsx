import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import type { EntryDraftMap, Language } from '../types/timesheet'
import { TimesheetDocument } from './TimesheetDocument'

const drafts: EntryDraftMap = {
  '2026-09-01': {
    entryDate: '2026-09-01',
    regular: '8',
    holiday: '',
    sick: '',
    vacation: '',
    overtime: '',
  },
  '2026-09-02': {
    entryDate: '2026-09-02',
    regular: '',
    holiday: '',
    sick: '',
    vacation: '',
    overtime: '',
  },
}

function renderDocument(language: Language, conciseReview = false): string {
  vi.stubGlobal('localStorage', {
    getItem: (key: string) =>
      key === 'synctime-language' ? language : null,
    setItem: () => undefined,
  })
  vi.stubGlobal('navigator', { language: `${language}-US` })

  return renderToStaticMarkup(
    <I18nProvider>
      <TimesheetDocument
        employeeName="Elena Morales"
        selection={{ year: 2026, month: 9, payPeriod: 'first_half' }}
        drafts={drafts}
        timesheet={null}
        conciseReview={conciseReview}
      />
    </I18nProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('timesheet document dates', () => {
  it('includes weekdays in English print-table dates', () => {
    expect(renderDocument('en')).toContain('<th>Tue, Sep 1</th>')
  })

  it('includes weekdays in Spanish print-table dates', () => {
    expect(renderDocument('es')).toContain('<th>mar, 1 de sept</th>')
  })

  it('keeps localized weekdays and zero-date filtering in concise review', () => {
    const markup = renderDocument('en', true)

    expect(markup).toContain('<strong>Tue, Sep 1</strong>')
    expect(markup).not.toContain('<strong>Wed, Sep 2</strong>')
  })
})
