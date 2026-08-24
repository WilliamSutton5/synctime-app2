import { afterEach, describe, expect, it, vi } from 'vitest'
import { translations } from '../i18n/translations'
import { submitPinConfirmation, submitPinUnlock } from './pinForm'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PIN confirmation submission', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['12345', '12345'],
    ['12a4', '12a4'],
    ['１２３４', '１２３４'],
  ])('requires exactly four ASCII digits', async (pin, confirmation) => {
    const submit = vi.fn()

    await expect(
      submitPinConfirmation(pin, confirmation, submit),
    ).resolves.toEqual({ ok: false, reason: 'invalid_pin' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('requires matching PIN values', async () => {
    const submit = vi.fn()

    await expect(
      submitPinConfirmation('1234', '4321', submit),
    ).resolves.toEqual({ ok: false, reason: 'pin_mismatch' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('passes a valid PIN to the create or reset operation', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)

    await expect(
      submitPinConfirmation('1234', '1234', submit),
    ).resolves.toEqual({ ok: true })
    expect(submit).toHaveBeenCalledOnce()
    expect(submit).toHaveBeenCalledWith('1234')
  })

  it('returns a predictable failure when the request fails', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('request failed'))

    await expect(
      submitPinConfirmation('1234', '1234', submit),
    ).resolves.toEqual({ ok: false, reason: 'request_failed' })
  })
})

describe('PIN unlock submission', () => {
  it('passes a valid PIN to verification and returns its status', async () => {
    const verify = vi.fn().mockResolvedValue('incorrect')

    await expect(submitPinUnlock('1234', verify)).resolves.toEqual({
      ok: true,
      status: 'incorrect',
    })
    expect(verify).toHaveBeenCalledWith('1234')
  })

  it('does not persist PIN values in browser storage', async () => {
    const localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    const sessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('sessionStorage', sessionStorage)

    await submitPinConfirmation('1234', '1234', async () => undefined)
    await submitPinUnlock('1234', async () => 'verified')

    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(sessionStorage.setItem).not.toHaveBeenCalled()
  })
})

describe('PIN translations', () => {
  it('provides the final English PIN interface copy', () => {
    expect(translations.en.pinSetupTitle).toBe('Create Your PIN')
    expect(translations.en.pinConfirmLabel).toBe('Confirm PIN')
    expect(translations.en.pinUnlockTitle).toBe('Welcome back')
    expect(translations.en.forgotPin).toBe('Forgot PIN?')
    expect(translations.en.pinResetTitle).toBe('Create a New PIN')
    expect(translations.en.pinIncorrect).toBe('Incorrect PIN. Try again.')
    expect(translations.en.pinLocked).toContain('Too many incorrect attempts')
  })

  it('provides the final Spanish PIN interface copy', () => {
    expect(translations.es.pinSetupTitle).toBe('Cree su PIN')
    expect(translations.es.pinConfirmLabel).toBe('Confirme el PIN')
    expect(translations.es.pinUnlockTitle).toBe('Bienvenido de nuevo')
    expect(translations.es.forgotPin).toBe('¿Olvidó su PIN?')
    expect(translations.es.pinResetTitle).toBe('Cree un PIN nuevo')
    expect(translations.es.pinIncorrect).toBe(
      'PIN incorrecto. Inténtelo de nuevo.',
    )
    expect(translations.es.pinLocked).toContain('Demasiados intentos incorrectos')
  })
})
