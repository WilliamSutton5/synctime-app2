import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n/I18nProvider'

export function LoginPage({
  onSendCode,
}: {
  onSendCode: (phone: string) => Promise<void>
}) {
  const { t } = useI18n()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const normalizedPhone = phone.replace(/[\s()-]/g, '')
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError(t('phoneRequired'))
      return
    }

    setIsSending(true)
    try {
      await onSendCode(normalizedPhone)
    } catch {
      setError(t('authError'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="auth-layout">
      <AppHeader />
      <main className="centered-panel">
        <section className="auth-card">
          <p className="eyebrow">SyncTime</p>
          <h1>{t('welcomeTitle')}</h1>
          <p>{t('loginDescription')}</p>
          <form onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>{t('phoneLabel')}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={isSending}
              />
              <small>{t('phoneHelp')}</small>
            </label>
            {error ? <Notice kind="error">{error}</Notice> : null}
            <button className="primary-button full-width" disabled={isSending}>
              {isSending ? t('sendingCode') : t('sendCode')}
            </button>
          </form>
        </section>
        <p className="auth-tagline">{t('appTagline')}</p>
      </main>
    </div>
  )
}
