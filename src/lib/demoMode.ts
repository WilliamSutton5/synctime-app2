export function shouldEnableDemoMode(dev: boolean, mode: string): boolean {
  return dev && mode === 'demo'
}

export const isDemoModeEnabled = shouldEnableDemoMode(
  import.meta.env.DEV,
  import.meta.env.MODE,
)
