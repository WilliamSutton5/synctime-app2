import type { ReactNode } from 'react'

type NoticeKind = 'success' | 'error' | 'info'

export function Notice({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: NoticeKind
}) {
  return (
    <div
      className={`notice notice--${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {children}
    </div>
  )
}
