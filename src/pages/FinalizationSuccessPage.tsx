import { useI18n } from '../i18n/I18nProvider'

export function FinalizationSuccessPage({
  onPrint,
  onBack,
}: {
  onPrint: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <main className="centered-panel success-page">
      <section className="success-card">
        <div className="success-check" aria-hidden="true">✓</div>
        <p className="eyebrow">SyncTime</p>
        <h1>{t('finalizedTitle')}</h1>
        <p>{t('finalizedMessage')}</p>
        <div className="success-actions">
          <button
            className="primary-button full-width"
            type="button"
            onClick={onPrint}
          >
            {t('printSavePdf')}
          </button>
          <button
            className="secondary-button full-width"
            type="button"
            onClick={onBack}
          >
            {t('backToTimesheet')}
          </button>
        </div>
      </section>
    </main>
  )
}
