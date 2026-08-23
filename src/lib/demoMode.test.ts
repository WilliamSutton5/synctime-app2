import { describe, expect, it } from 'vitest'
import { shouldEnableDemoMode } from './demoMode'

describe('demo-mode safety gate', () => {
  it('enables demo mode only for a demo development server', () => {
    expect(shouldEnableDemoMode(true, 'demo')).toBe(true)
  })

  it('does not enable demo mode in a production build, even with demo mode selected', () => {
    expect(shouldEnableDemoMode(false, 'demo')).toBe(false)
  })

  it('does not enable demo mode during normal local development', () => {
    expect(shouldEnableDemoMode(true, 'development')).toBe(false)
  })
})
