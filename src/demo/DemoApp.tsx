import { useState } from 'react'
import { TimesheetPage } from '../pages/TimesheetPage'
import { createDemoTimesheetDataSource, demoProfile } from './demoData'

export function DemoApp() {
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
      onSignOut={() =>
        setDemoSession((session) => ({
          id: session.id + 1,
          dataSource: createDemoTimesheetDataSource(),
        }))
      }
    />
  )
}
