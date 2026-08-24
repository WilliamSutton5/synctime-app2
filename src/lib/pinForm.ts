import { isValidPin, type PinVerificationStatus } from './authData'

export type PinConfirmationFailure =
  | 'invalid_pin'
  | 'pin_mismatch'
  | 'request_failed'

export type PinConfirmationResult =
  | { ok: true }
  | { ok: false; reason: PinConfirmationFailure }

export type PinUnlockResult =
  | { ok: true; status: PinVerificationStatus }
  | { ok: false; reason: 'invalid_pin' | 'request_failed' }

export async function submitPinConfirmation(
  pin: string,
  confirmation: string,
  submit: (pin: string) => Promise<void>,
): Promise<PinConfirmationResult> {
  if (!isValidPin(pin) || !isValidPin(confirmation)) {
    return { ok: false, reason: 'invalid_pin' }
  }
  if (pin !== confirmation) {
    return { ok: false, reason: 'pin_mismatch' }
  }

  try {
    await submit(pin)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'request_failed' }
  }
}

export async function submitPinUnlock(
  pin: string,
  verify: (pin: string) => Promise<PinVerificationStatus>,
): Promise<PinUnlockResult> {
  if (!isValidPin(pin)) return { ok: false, reason: 'invalid_pin' }

  try {
    return { ok: true, status: await verify(pin) }
  } catch {
    return { ok: false, reason: 'request_failed' }
  }
}
