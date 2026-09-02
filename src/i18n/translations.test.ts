import { describe, expect, it } from 'vitest'
import { translations } from './translations'

describe('local-first workflow translations', () => {
  it('provides clear English name, finalization, and PDF handoff copy', () => {
    expect(translations.en.profileTitle).toBe('Enter your full name')
    expect(translations.en.editName).toBe('Edit name')
    expect(translations.en.reviewAndFinalize).toBe('Review & Finalize')
    expect(translations.en.finalizedMessage).toContain(
      'forward the PDF to your manager',
    )
    expect(translations.en.localStorageNotice).toContain('this device')
  })

  it('provides clear Spanish name, finalization, and PDF handoff copy', () => {
    expect(translations.es.profileTitle).toBe(
      'Ingrese su nombre completo',
    )
    expect(translations.es.editName).toBe('Editar nombre')
    expect(translations.es.reviewAndFinalize).toBe('Revisar y finalizar')
    expect(translations.es.finalizedMessage).toContain(
      'envíe el PDF a su gerente',
    )
    expect(translations.es.localStorageNotice).toContain('este navegador')
  })

  it('contains no retired authentication terminology', () => {
    const copy = Object.values(translations).flatMap(Object.values).join(' ')
    expect(copy).not.toMatch(
      /\b(otp|pin|sms|phone|email|sign[ -]?in|sign[ -]?out|authentication|contraseña|correo|teléfono)\b/i,
    )
  })
})
