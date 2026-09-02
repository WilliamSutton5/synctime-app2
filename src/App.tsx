import { useState } from 'react'
import { DemoApp } from './demo/DemoApp'
import { useI18n } from './i18n/I18nProvider'
import { isDemoModeEnabled } from './lib/demoMode'
import { loadLocalProfile, saveLocalProfile } from './lib/localPersistence'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { TimesheetPage } from './pages/TimesheetPage'
import type { Profile } from './types/timesheet'

function initialProfile(): Profile | null {
  try {
    return loadLocalProfile()
  } catch {
    return null
  }
}

function LocalApp() {
  const { t } = useI18n()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [isEditingName, setIsEditingName] = useState(false)

  if (!profile || isEditingName) {
    return (
      <ProfileSetupPage
        initialName={profile?.fullName ?? ''}
        isEditing={Boolean(profile)}
        onCancel={profile ? () => setIsEditingName(false) : undefined}
        onSave={async (fullName) => {
          const savedProfile = saveLocalProfile(fullName, profile)
          setProfile(savedProfile)
          setIsEditingName(false)
        }}
      />
    )
  }

  return (
    <TimesheetPage
      profile={profile}
      headerActionLabel={t('editName')}
      onHeaderAction={() => setIsEditingName(true)}
    />
  )
}

export default function App() {
  return isDemoModeEnabled ? <DemoApp /> : <LocalApp />
}
