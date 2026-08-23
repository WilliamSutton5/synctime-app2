import { useI18n } from '../i18n/I18nProvider'

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="language-toggle" aria-label={t('languageLabel')}>
      <button
        className={language === 'en' ? 'is-active' : ''}
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        {t('english')}
      </button>
      <span aria-hidden="true">/</span>
      <button
        className={language === 'es' ? 'is-active' : ''}
        type="button"
        aria-pressed={language === 'es'}
        onClick={() => setLanguage('es')}
      >
        {t('spanish')}
      </button>
    </div>
  )
}
