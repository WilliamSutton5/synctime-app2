import { useRef, useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { PinInput } from '../components/PinInput'
import { useI18n } from '../i18n/I18nProvider'
import type { PinVerificationStatus } from '../lib/authData'
import { submitPinUnlock } from '../lib/pinForm'

type UnlockError =
  | 'pinInvalid'
  | 'pinIncorrect'
  | 'pinLocked'
  | 'pinUnlockError'

export function PinUnlockPage({
  onUnlock,
  onForgotPin,
  onSignOut,
}: {
  onUnlock: (pin: string) => Promise<PinVerificationStatus>
  onForgotPin: () => void
  onSignOut: () => void
}) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [errorKey, setErrorKey] = useState<UnlockError | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)
  const errorId = errorKey ? 'pin-unlock-error' : undefined

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setIsVerifying(true)

    const result = await submitPinUnlock(pin, onUnlock)
    setIsVerifying(false)

    if (!result.ok) {
      setPin('')
      setErrorKey(
        result.reason === 'invalid_pin' ? 'pinInvalid' : 'pinUnlockError',
      )
      pinRef.current?.focus()
      return
    }

    setPin('')
    if (result.status === 'incorrect') setErrorKey('pinIncorrect')
    if (result.status === 'locked') setErrorKey('pinLocked')
    pinRef.current?.focus()
  }

  return (
    <div className="auth-layout">
      <AppHeader signOutLabel={t('signOut')} onSignOut={onSignOut} />
      <main className="centered-panel pin-panel">
        <section className="auth-card pin-card pin-card--unlock">
          <p className="eyebrow">SyncTime</p>
          <h1>{t('pinUnlockTitle')}</h1>
          <p>{t('pinUnlockDescription')}</p>
          <form className="pin-form" onSubmit={handleSubmit} noValidate>
            <PinInput
              ref={pinRef}
              id="unlock-pin"
              label={t('pinLabel')}
              value={pin}
              onChange={(value) => {
                setPin(value)
                setErrorKey(null)
              }}
              disabled={isVerifying}
              errorId={errorId}
              autoFocus
            />
            {errorKey ? (
              <div id={errorId}>
                <Notice kind="error">{t(errorKey)}</Notice>
              </div>
            ) : null}
            <button
              className="primary-button full-width"
              disabled={isVerifying}
            >
              {t(isVerifying ? 'verifyingPin' : 'unlockAction')}
            </button>
            <button
              className="text-button full-width pin-recovery-action"
              type="button"
              onClick={onForgotPin}
              disabled={isVerifying}
            >
              {t('forgotPin')}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
