import { LanguageToggle } from './LanguageToggle'

export function AppHeader({
  greeting,
  signOutLabel,
  onSignOut,
}: {
  greeting?: string
  signOutLabel?: string
  onSignOut?: () => void
}) {
  return (
    <header className="app-header no-print">
      <div className="app-header__inner">
        <div className="wordmark" aria-label="SyncTime">
          <span className="wordmark__mark" aria-hidden="true">
            S
          </span>
          <span>SyncTime</span>
        </div>
        <div className="app-header__actions">
          {greeting ? <span className="header-greeting">{greeting}</span> : null}
          <LanguageToggle />
          {onSignOut && signOutLabel ? (
            <button className="text-button" type="button" onClick={onSignOut}>
              {signOutLabel}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
