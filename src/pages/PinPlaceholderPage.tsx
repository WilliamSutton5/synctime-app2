import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n/I18nProvider'
import { isValidPin } from '../lib/authData'
import type { PinUnlockIssue } from '../lib/authState'
import type { TranslationKey } from '../i18n/translations'

type PinMode = 'setup' | 'unlock' | 'reset'

const copy: Record<
  PinMode,
  { title: TranslationKey; description: TranslationKey; action: TranslationKey }
> = {
  setup: {
    title: 'pinSetupTitle',
    description: 'pinSetupDescription',
    action: 'createPinAction',
  },
  unlock: {
    title: 'pinUnlockTitle',
    description: 'pinUnlockDescription',
    action: 'unlockAction',
  },
  reset: {
    title: 'pinResetTitle',
    description: 'pinResetDescription',
    action: 'resetPinAction',
  },
}

export function PinPlaceholderPage({
  mode,
  issue,
  onSubmit,
  onForgotPin,
  onSignOut,
}: {
  mode: PinMode
  issue?: PinUnlockIssue
  onSubmit: (pin: string) => Promise<void>
  onForgotPin?: () => void
  onSignOut: () => void
}) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const modeCopy = copy[mode]

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!isValidPin(pin)) {
      setError(t('pinInvalid'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(pin)
      setPin('')
    } catch {
      setError(t('pinActionError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <AppHeader signOutLabel={t('signOut')} onSignOut={onSignOut} />
      <main className="centered-panel">
        <section className="auth-card">
          <p className="eyebrow">SyncTime</p>
          <h1>{t(modeCopy.title)}</h1>
          <p>{t(modeCopy.description)}</p>
          <form onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>{t('pinLabel')}</span>
              <input
                className="otp-input"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder={t('pinPlaceholder')}
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                }
                disabled={isSubmitting}
              />
            </label>
            {issue === 'incorrect' ? (
              <Notice kind="error">{t('pinIncorrect')}</Notice>
            ) : null}
            {issue === 'locked' ? (
              <Notice kind="error">{t('pinLocked')}</Notice>
            ) : null}
            {error ? <Notice kind="error">{error}</Notice> : null}
            <button
              className="primary-button full-width"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('pinWorking') : t(modeCopy.action)}
            </button>
            {mode === 'unlock' && onForgotPin ? (
              <button
                className="text-button full-width"
                type="button"
                onClick={onForgotPin}
                disabled={isSubmitting}
              >
                {t('forgotPin')}
              </button>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  )
}
