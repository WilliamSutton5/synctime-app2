import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n/I18nProvider'

export function ProfileSetupPage({
  onSave,
  onSignOut,
}: {
  onSave: (fullName: string) => Promise<void>
  onSignOut: () => void
}) {
  const { t } = useI18n()
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const trimmedName = fullName.trim()
    if (trimmedName.length < 2) {
      setError(t('nameRequired'))
      return
    }

    setIsSaving(true)
    try {
      await onSave(trimmedName)
    } catch {
      setError(t('profileError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="auth-layout">
      <AppHeader signOutLabel={t('signOut')} onSignOut={onSignOut} />
      <main className="centered-panel">
        <section className="auth-card">
          <p className="eyebrow">SyncTime</p>
          <h1>{t('profileTitle')}</h1>
          <p>{t('profileDescription')}</p>
          <form onSubmit={handleSubmit} noValidate>
            <label className="form-field">
              <span>{t('fullNameLabel')}</span>
              <input
                type="text"
                autoComplete="name"
                maxLength={120}
                placeholder={t('fullNamePlaceholder')}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isSaving}
              />
            </label>
            {error ? <Notice kind="error">{error}</Notice> : null}
            <button className="primary-button full-width" disabled={isSaving}>
              {isSaving ? t('savingProfile') : t('saveAndContinue')}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
