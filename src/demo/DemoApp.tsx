import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { TimesheetPage } from '../pages/TimesheetPage'
import { createDemoTimesheetDataSource, demoProfile } from './demoData'

export function DemoApp() {
  const { t } = useI18n()
  const [demoSession, setDemoSession] = useState(() => ({
    id: 0,
    dataSource: createDemoTimesheetDataSource(),
  }))

  return (
    <TimesheetPage
      key={demoSession.id}
      profile={demoProfile}
      dataSource={demoSession.dataSource}
      demoMode
      headerActionLabel={t('restartDemo')}
      onHeaderAction={() =>
        setDemoSession((session) => ({
          id: session.id + 1,
          dataSource: createDemoTimesheetDataSource(),
        }))
      }
    />
  )
}
