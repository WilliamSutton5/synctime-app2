import { useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Notice } from '../components/Notice'
import { useI18n } from '../i18n/I18nProvider'

export function ProfileSetupPage({
  initialName = '',
  isEditing = false,
  onSave,
  onCancel,
}: {
  initialName?: string
  isEditing?: boolean
  onSave: (fullName: string) => Promise<void>
  onCancel?: () => void
}) {
  const { t } = useI18n()
  const [fullName, setFullName] = useState(initialName)
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
    <div className="profile-layout">
      <AppHeader />
      <main className="centered-panel">
        <section className="profile-card">
          <p className="eyebrow">SyncTime</p>
          <h1>{t(isEditing ? 'editNameTitle' : 'profileTitle')}</h1>
          <p>{t(isEditing ? 'editNameDescription' : 'profileDescription')}</p>
          <p className="helper-text">{t('localStorageNotice')}</p>
          <form className="profile-form" onSubmit={handleSubmit} noValidate>
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
            <div className="profile-actions">
              {onCancel ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={onCancel}
                >
                  {t('cancel')}
                </button>
              ) : null}
              <button className="primary-button" disabled={isSaving}>
                {isSaving
                  ? t(isEditing ? 'updatingName' : 'savingProfile')
                  : t(isEditing ? 'updateName' : 'saveAndContinue')}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
