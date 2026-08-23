import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n/I18nProvider'

export function VerifyOtpPage({
  phone,
  onVerify,
  onBack,
}: {
  phone: string
  onVerify: (code: string) => Promise<void>
  onBack: () => void
}) {
  const { t } = useI18n()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(code)) {
      setError(t('codeRequired'))
      return
    }

    setIsVerifying(true)
    try {
      await onVerify(code)
    } catch {
      setError(t('authError'))
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="auth-layout">
      <AppHeader />
      <main className="centered-panel">
        <section className="auth-card">
          <p className="eyebrow">{t('codeSent')}</p>
          <h1>{t('otpTitle')}</h1>
          <p>{t('otpDescription', { phone })}</p>
          <form onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>{t('otpLabel')}</span>
              <input
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder={t('otpPlaceholder')}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                disabled={isVerifying}
              />
            </label>
            {error ? <Notice kind="error">{error}</Notice> : null}
            <button className="primary-button full-width" disabled={isVerifying}>
              {isVerifying ? t('verifyingCode') : t('verifyCode')}
            </button>
            <button
              className="text-button full-width"
              type="button"
              onClick={onBack}
              disabled={isVerifying}
            >
              {t('useDifferentPhone')}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
