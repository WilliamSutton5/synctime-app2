import { AppHeader } from '../components/AppHeader'
import { useI18n } from '../i18n/I18nProvider'

export function ConfigurationPage() {
  const { t } = useI18n()
  return (
    <div className="auth-layout">
      <AppHeader />
      <main className="centered-panel">
        <section className="auth-card">
          <div className="config-icon" aria-hidden="true">!</div>
          <h1>{t('configurationTitle')}</h1>
          <p>{t('configurationBody')}</p>
          <p className="helper-text">{t('configurationHint')}</p>
        </section>
      </main>
    </div>
  )
}
