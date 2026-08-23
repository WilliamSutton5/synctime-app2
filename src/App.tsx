import { useEffect, useReducer } from 'react'
import { AppHeader } from './components/AppHeader'
import { LoadingState } from './components/LoadingState'
import { Notice } from './components/Notice'
import { DemoApp } from './demo/DemoApp'
import { useI18n } from './i18n/I18nProvider'
import {
  createPin,
  getCurrentSession,
  hasPin,
  resetPin,
  sendPhoneOtp,
  signOut,
  verifyPhoneOtp,
  verifyPin,
} from './lib/authData'
import {
  initialAuthenticationState,
  transitionAuthenticationState,
} from './lib/authState'
import { isDemoModeEnabled } from './lib/demoMode'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { getProfile, saveProfile } from './lib/timesheetData'
import { ConfigurationPage } from './pages/ConfigurationPage'
import { LoginPage } from './pages/LoginPage'
import { PinPlaceholderPage } from './pages/PinPlaceholderPage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { TimesheetPage } from './pages/TimesheetPage'
import { VerifyOtpPage } from './pages/VerifyOtpPage'

function ProductionApp() {
  const { language, t } = useI18n()
  const [authState, dispatch] = useReducer(
    transitionAuthenticationState,
    initialAuthenticationState,
  )

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    void getCurrentSession().then((result) => {
      if (!active) return
      if (result.ok) {
        dispatch({ type: 'SESSION_RESOLVED', session: result.data })
      } else if (result.error.code === 'not_authenticated') {
        dispatch({ type: 'SESSION_RESOLVED', session: null })
      } else {
        dispatch({
          type: 'FLOW_FAILED',
          message: 'authError',
          retry: { status: 'checking-session' },
        })
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (
        event === 'SIGNED_OUT' ||
        (event !== 'INITIAL_SESSION' && !nextSession)
      ) {
        dispatch({ type: 'SESSION_LOST' })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (authState.status !== 'checking-account') return

    const checkingState = authState
    let active = true

    void hasPin().then(async (pinResult) => {
      if (!active) return
      if (!pinResult.ok) {
        if (pinResult.error.code === 'not_authenticated') {
          dispatch({ type: 'SESSION_LOST' })
          return
        }
        dispatch({
          type: 'FLOW_FAILED',
          message: 'authError',
          retry: checkingState,
        })
        return
      }

      if (pinResult.data && checkingState.source === 'existing-session') {
        dispatch({
          type: 'ACCOUNT_RESOLVED',
          hasPin: true,
          profile: null,
        })
        return
      }

      try {
        const profile = await getProfile(checkingState.session.user.id)
        if (active) {
          dispatch({
            type: 'ACCOUNT_RESOLVED',
            hasPin: pinResult.data,
            profile,
          })
        }
      } catch {
        if (active) {
          dispatch({
            type: 'FLOW_FAILED',
            message: 'loadError',
            retry: checkingState,
          })
        }
      }
    })

    return () => {
      active = false
    }
  }, [authState])

  useEffect(() => {
    if (authState.status !== 'loading-application') return

    const loadingState = authState
    let active = true
    void getProfile(loadingState.session.user.id)
      .then((profile) => {
        if (active) {
          dispatch({ type: 'APPLICATION_PROFILE_RESOLVED', profile })
        }
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: 'FLOW_FAILED',
            message: 'loadError',
            retry: loadingState,
          })
        }
      })

    return () => {
      active = false
    }
  }, [authState])

  async function handleSendCode(phone: string) {
    const result = await sendPhoneOtp(phone)
    if (!result.ok) {
      throw new Error(result.error.debugMessage ?? result.error.message)
    }
    dispatch({ type: 'PHONE_OTP_SENT', phone })
  }

  async function handleVerifyCode(phone: string, code: string) {
    const result = await verifyPhoneOtp(phone, code)
    if (!result.ok) {
      throw new Error(result.error.debugMessage ?? result.error.message)
    }
    dispatch({ type: 'OTP_VERIFIED', session: result.data })
  }

  async function handleSignOut() {
    const result = await signOut()
    if (!result.ok) {
      window.alert(t('signOutError'))
      return
    }
    dispatch({ type: 'SIGN_OUT_SUCCEEDED' })
  }

  async function handleCreatePin(pin: string) {
    const result = await createPin(pin)
    if (!result.ok) {
      throw new Error(result.error.debugMessage ?? result.error.message)
    }
    dispatch({ type: 'PIN_CREATED' })
  }

  async function handleVerifyPin(pin: string) {
    const result = await verifyPin(pin)
    if (!result.ok) {
      throw new Error(result.error.debugMessage ?? result.error.message)
    }
    dispatch({ type: 'PIN_VERIFICATION_RESOLVED', result: result.data })
  }

  async function handleResetPin(pin: string) {
    const result = await resetPin(pin)
    if (!result.ok) {
      throw new Error(result.error.debugMessage ?? result.error.message)
    }
    dispatch({ type: 'PIN_RESET' })
  }

  if (!isSupabaseConfigured) return <ConfigurationPage />

  switch (authState.status) {
    case 'checking-session':
      return (
        <div className="auth-layout">
          <AppHeader />
          <LoadingState message={t('loadingSession')} />
        </div>
      )

    case 'checking-account':
      return (
        <div className="auth-layout">
          <AppHeader signOutLabel={t('signOut')} onSignOut={handleSignOut} />
          <LoadingState message={t('checkingAccount')} />
        </div>
      )

    case 'loading-application':
      return (
        <div className="auth-layout">
          <AppHeader signOutLabel={t('signOut')} onSignOut={handleSignOut} />
          <LoadingState message={t('loadingProfile')} />
        </div>
      )

    case 'phone-entry':
      return <LoginPage onSendCode={handleSendCode} />

    case 'pin-recovery-phone':
      return <LoginPage mode="pin-recovery" onSendCode={handleSendCode} />

    case 'otp-verification':
      return (
        <VerifyOtpPage
          phone={authState.phone}
          onBack={() => dispatch({ type: 'OTP_BACK' })}
          onVerify={(code) => handleVerifyCode(authState.phone, code)}
        />
      )

    case 'profile-setup':
      return (
        <ProfileSetupPage
          onSignOut={handleSignOut}
          onSave={async (fullName) => {
            const profile = await saveProfile(
              authState.session.user.id,
              fullName,
            )
            dispatch({ type: 'PROFILE_SAVED', profile })
          }}
        />
      )

    case 'pin-setup':
      return (
        <PinPlaceholderPage
          mode="setup"
          onSignOut={handleSignOut}
          onSubmit={handleCreatePin}
        />
      )

    case 'pin-unlock':
      return (
        <PinPlaceholderPage
          mode="unlock"
          issue={authState.issue}
          onSignOut={handleSignOut}
          onForgotPin={() => dispatch({ type: 'START_PIN_RECOVERY' })}
          onSubmit={handleVerifyPin}
        />
      )

    case 'pin-reset':
      return (
        <PinPlaceholderPage
          mode="reset"
          onSignOut={handleSignOut}
          onSubmit={handleResetPin}
        />
      )

    case 'authentication-error':
      return (
        <div className="auth-layout">
          <AppHeader />
          <main className="centered-panel">
            <section className="auth-card">
              <Notice kind="error">{t(authState.message)}</Notice>
              <button
                className="primary-button full-width"
                type="button"
                onClick={() => dispatch({ type: 'RETRY' })}
              >
                {t('retry')}
              </button>
            </section>
          </main>
        </div>
      )

    case 'unlocked':
      return (
        <TimesheetPage
          profile={authState.profile}
          onSignOut={handleSignOut}
        />
      )
  }
}

export default function App() {
  return isDemoModeEnabled ? <DemoApp /> : <ProductionApp />
}
