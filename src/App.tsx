import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppHeader } from './components/AppHeader'
import { LoadingState } from './components/LoadingState'
import { Notice } from './components/Notice'
import { DemoApp } from './demo/DemoApp'
import { useI18n } from './i18n/I18nProvider'
import { isDemoModeEnabled } from './lib/demoMode'
import { getSupabaseClient, isSupabaseConfigured, supabase } from './lib/supabase'
import { getProfile, saveProfile } from './lib/timesheetData'
import { ConfigurationPage } from './pages/ConfigurationPage'
import { LoginPage } from './pages/LoginPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { TimesheetPage } from './pages/TimesheetPage'
import { VerifyOtpPage } from './pages/VerifyOtpPage'
import type { Profile } from './types/timesheet'

function AuthenticationFlow() {
  const [phone, setPhone] = useState('')

  if (!phone) {
    return (
      <LoginPage
        onSendCode={async (submittedPhone) => {
          const { error } = await getSupabaseClient().auth.signInWithOtp({
            phone: submittedPhone,
            options: { shouldCreateUser: true },
          })
          if (error) throw error
          setPhone(submittedPhone)
        }}
      />
    )
  }

  return (
    <VerifyOtpPage
      phone={phone}
      onBack={() => setPhone('')}
      onVerify={async (code) => {
        const { error } = await getSupabaseClient().auth.verifyOtp({
          phone,
          token: code,
          type: 'sms',
        })
        if (error) throw error
      }}
    />
  )
}

function ProductionApp() {
  const { language, t } = useI18n()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(
    isSupabaseConfigured,
  )
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileLoadError, setProfileLoadError] = useState(false)
  const [profileReload, setProfileReload] = useState(0)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (!supabase) return

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsCheckingSession(false)
      if (!nextSession) {
        setProfile(null)
        setIsLoadingProfile(false)
        setProfileLoadError(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return

    let active = true
    void Promise.resolve()
      .then(() => {
        if (!active) return null
        setIsLoadingProfile(true)
        setProfileLoadError(false)
        return getProfile(session.user.id)
      })
      .then((loadedProfile) => {
        if (active) setProfile(loadedProfile)
      })
      .catch(() => {
        if (active) setProfileLoadError(true)
      })
      .finally(() => {
        if (active) setIsLoadingProfile(false)
      })

    return () => {
      active = false
    }
  }, [profileReload, session?.user])

  async function handleSignOut() {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) window.alert(t('signOutError'))
  }

  if (!isSupabaseConfigured) return <ConfigurationPage />

  if (isCheckingSession) {
    return (
      <div className="auth-layout">
        <AppHeader />
        <LoadingState message={t('loadingSession')} />
      </div>
    )
  }

  if (!session) return <AuthenticationFlow />

  if (isLoadingProfile) {
    return (
      <div className="auth-layout">
        <AppHeader signOutLabel={t('signOut')} onSignOut={handleSignOut} />
        <LoadingState message={t('loadingProfile')} />
      </div>
    )
  }

  if (profileLoadError) {
    return (
      <div className="auth-layout">
        <AppHeader signOutLabel={t('signOut')} onSignOut={handleSignOut} />
        <main className="centered-panel">
          <section className="auth-card">
            <Notice kind="error">{t('loadError')}</Notice>
            <button
              className="primary-button full-width"
              type="button"
              onClick={() => setProfileReload((value) => value + 1)}
            >
              {t('retry')}
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <ProfileSetupPage
        onSignOut={handleSignOut}
        onSave={async (fullName) => {
          const saved = await saveProfile(session.user.id, fullName)
          setProfile(saved)
        }}
      />
    )
  }

  return <TimesheetPage profile={profile} onSignOut={handleSignOut} />
}

export default function App() {
  return isDemoModeEnabled ? <DemoApp /> : <ProductionApp />
}
