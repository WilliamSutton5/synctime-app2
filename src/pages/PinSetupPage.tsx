import { useRef, useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { PinInput } from '../components/PinInput'
import { useI18n } from '../i18n/I18nProvider'
import { submitPinConfirmation } from '../lib/pinForm'

export function PinSetupPage({
  purpose,
  onSubmit,
  onSignOut,
}: {
  purpose: 'create' | 'reset'
  onSubmit: (pin: string) => Promise<void>
  onSignOut: () => void
}) {
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errorKey, setErrorKey] = useState<
    'pinInvalid' | 'pinMismatch' | 'pinCreateError' | 'pinResetError' | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const isReset = purpose === 'reset'
  const errorId = errorKey ? 'pin-confirmation-error' : undefined

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErrorKey(null)
    setIsSubmitting(true)

    const result = await submitPinConfirmation(pin, confirmation, onSubmit)
    setIsSubmitting(false)

    if (result.ok) {
      setPin('')
      setConfirmation('')
      return
    }

    if (result.reason === 'invalid_pin') {
      setErrorKey('pinInvalid')
      if (pin.length !== 4) pinRef.current?.focus()
      else confirmationRef.current?.focus()
      return
    }

    if (result.reason === 'pin_mismatch') {
      setConfirmation('')
      setErrorKey('pinMismatch')
      confirmationRef.current?.focus()
      return
    }

    setPin('')
    setConfirmation('')
    setErrorKey(isReset ? 'pinResetError' : 'pinCreateError')
    pinRef.current?.focus()
  }

  return (
    <div className="auth-layout">
      <AppHeader signOutLabel={t('signOut')} onSignOut={onSignOut} />
      <main className="centered-panel pin-panel">
        <section className="auth-card pin-card">
          <p className="eyebrow">SyncTime</p>
          <h1>{t(isReset ? 'pinResetTitle' : 'pinSetupTitle')}</h1>
          <p>{t(isReset ? 'pinResetDescription' : 'pinSetupDescription')}</p>
          <form className="pin-form" onSubmit={handleSubmit} noValidate>
            <PinInput
              ref={pinRef}
              id={isReset ? 'new-pin' : 'pin'}
              label={t(isReset ? 'pinNewLabel' : 'pinLabel')}
              value={pin}
              onChange={(value) => {
                setPin(value)
                setErrorKey(null)
              }}
              disabled={isSubmitting}
              errorId={
                errorKey === 'pinInvalid' || errorKey === 'pinCreateError' ||
                errorKey === 'pinResetError'
                  ? errorId
                  : undefined
              }
              autoFocus
            />
            <PinInput
              ref={confirmationRef}
              id={isReset ? 'confirm-new-pin' : 'confirm-pin'}
              label={t(isReset ? 'pinConfirmNewLabel' : 'pinConfirmLabel')}
              value={confirmation}
              onChange={(value) => {
                setConfirmation(value)
                setErrorKey(null)
              }}
              disabled={isSubmitting}
              errorId={errorId}
            />
            {errorKey ? (
              <div id={errorId}>
                <Notice kind="error">{t(errorKey)}</Notice>
              </div>
            ) : null}
            <button
              className="primary-button full-width"
              disabled={isSubmitting}
            >
              {t(
                isSubmitting
                  ? isReset
                    ? 'resettingPin'
                    : 'creatingPin'
                  : isReset
                    ? 'resetPinAction'
                    : 'createPinAction',
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
