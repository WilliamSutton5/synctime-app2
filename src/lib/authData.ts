import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { getSupabaseClient } from './supabase'

export type PinVerificationStatus =
  Database['public']['Enums']['pin_verification_status']

export type AuthDataErrorCode =
  | 'invalid_phone_number'
  | 'invalid_otp'
  | 'invalid_pin'
  | 'not_authenticated'
  | 'recent_phone_otp_required'
  | 'profile_required'
  | 'pin_already_configured'
  | 'pin_not_configured'
  | 'rate_limited'
  | 'configuration_error'
  | 'unexpected_response'
  | 'request_failed'

export interface AuthDataError {
  code: AuthDataErrorCode
  message: string
  debugMessage?: string
  providerCode?: string
  status?: number
}

export type AuthDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthDataError }

export interface AuthDataAccess {
  sendPhoneOtp: (phoneNumber: string) => Promise<AuthDataResult<null>>
  verifyPhoneOtp: (
    phoneNumber: string,
    token: string,
  ) => Promise<AuthDataResult<Session>>
  getCurrentSession: () => Promise<AuthDataResult<Session | null>>
  signOut: () => Promise<AuthDataResult<null>>
  hasPin: () => Promise<AuthDataResult<boolean>>
  createPin: (pin: string) => Promise<AuthDataResult<null>>
  verifyPin: (
    pin: string,
  ) => Promise<AuthDataResult<PinVerificationStatus>>
  resetPin: (pin: string) => Promise<AuthDataResult<null>>
}

type AuthSupabaseClient = Pick<SupabaseClient<Database>, 'auth' | 'rpc'>

const pinStatuses = new Set<PinVerificationStatus>([
  'verified',
  'incorrect',
  'locked',
  'not_configured',
])

const errorMessages: Record<AuthDataErrorCode, string> = {
  invalid_phone_number:
    'Enter a valid phone number including its country code.',
  invalid_otp: 'Enter the verification code sent to the phone.',
  invalid_pin: 'PIN must contain exactly 4 digits.',
  not_authenticated: 'An authenticated session is required.',
  recent_phone_otp_required:
    'Recent phone verification is required to complete this action.',
  profile_required: 'Complete the employee profile before creating a PIN.',
  pin_already_configured: 'A PIN has already been configured.',
  pin_not_configured: 'A PIN has not been configured.',
  rate_limited: 'Too many attempts. Wait a moment and try again.',
  configuration_error: 'Supabase authentication is not configured.',
  unexpected_response:
    'Supabase returned an unexpected authentication response.',
  request_failed: 'The authentication request could not be completed.',
}

export function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.trim().replace(/[\s().-]/g, '')
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(phoneNumber))
}

export function isValidPhoneOtp(token: string): boolean {
  return /^\d{6}$/.test(token.trim())
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

function success<T>(data: T): AuthDataResult<T> {
  return { ok: true, data }
}

function failure(
  code: AuthDataErrorCode,
  details: Omit<AuthDataError, 'code' | 'message'> = {},
): AuthDataResult<never> {
  return {
    ok: false,
    error: { code, message: errorMessages[code], ...details },
  }
}

function errorDetails(error: unknown): {
  debugMessage?: string
  providerCode?: string
  status?: number
} {
  if (!error || typeof error !== 'object') {
    return error === undefined ? {} : { debugMessage: String(error) }
  }

  const value = error as Record<string, unknown>
  const debugMessage =
    typeof value.message === 'string' ? value.message : undefined
  const providerCode =
    typeof value.code === 'string' ? value.code : undefined
  const status = typeof value.status === 'number' ? value.status : undefined

  return { debugMessage, providerCode, status }
}

function normalizeError(error: unknown): AuthDataResult<never> {
  const details = errorDetails(error)
  const searchable = `${details.providerCode ?? ''} ${details.debugMessage ?? ''}`
    .toUpperCase()
    .replaceAll(' ', '_')

  if (searchable.includes('PIN_MUST_BE_FOUR_DIGITS')) {
    return failure('invalid_pin', details)
  }
  if (searchable.includes('RECENT_PHONE_OTP_REQUIRED')) {
    return failure('recent_phone_otp_required', details)
  }
  if (searchable.includes('PROFILE_REQUIRED')) {
    return failure('profile_required', details)
  }
  if (searchable.includes('PIN_ALREADY_CONFIGURED')) {
    return failure('pin_already_configured', details)
  }
  if (searchable.includes('PIN_NOT_CONFIGURED')) {
    return failure('pin_not_configured', details)
  }
  if (
    details.status === 401 ||
    details.status === 403 ||
    searchable.includes('AUTHENTICATION_REQUIRED') ||
    searchable.includes('NOT_AUTHENTICATED')
  ) {
    return failure('not_authenticated', details)
  }
  if (
    details.status === 429 ||
    searchable.includes('RATE_LIMIT') ||
    searchable.includes('OVER_REQUEST_RATE_LIMIT')
  ) {
    return failure('rate_limited', details)
  }
  if (searchable.includes('SUPABASE_PUBLIC_CONFIGURATION_IS_MISSING')) {
    return failure('configuration_error', details)
  }

  return failure('request_failed', details)
}

async function safely<T>(
  operation: () => Promise<AuthDataResult<T>>,
): Promise<AuthDataResult<T>> {
  try {
    return await operation()
  } catch (error) {
    return normalizeError(error)
  }
}

export function createAuthDataAccess(
  client: AuthSupabaseClient,
): AuthDataAccess {
  return {
    sendPhoneOtp(phoneNumber) {
      const phone = normalizePhoneNumber(phoneNumber)
      if (!isValidPhoneNumber(phone)) {
        return Promise.resolve(failure('invalid_phone_number'))
      }

      return safely(async () => {
        const { error } = await client.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: true },
        })

        return error ? normalizeError(error) : success(null)
      })
    },

    verifyPhoneOtp(phoneNumber, token) {
      const phone = normalizePhoneNumber(phoneNumber)
      const normalizedToken = token.trim()
      if (!isValidPhoneNumber(phone)) {
        return Promise.resolve(failure('invalid_phone_number'))
      }
      if (!isValidPhoneOtp(normalizedToken)) {
        return Promise.resolve(failure('invalid_otp'))
      }

      return safely(async () => {
        const { data, error } = await client.auth.verifyOtp({
          phone,
          token: normalizedToken,
          type: 'sms',
        })

        if (error) return normalizeError(error)
        if (!data.session) return failure('unexpected_response')
        return success(data.session)
      })
    },

    getCurrentSession() {
      return safely(async () => {
        const { data, error } = await client.auth.getSession()
        return error ? normalizeError(error) : success(data.session)
      })
    },

    signOut() {
      return safely(async () => {
        const { error } = await client.auth.signOut()
        return error ? normalizeError(error) : success(null)
      })
    },

    hasPin() {
      return safely(async () => {
        const { data, error } = await client.rpc('has_pin')
        if (error) return normalizeError(error)
        if (typeof data !== 'boolean') return failure('unexpected_response')
        return success(data)
      })
    },

    createPin(pin) {
      if (!isValidPin(pin)) return Promise.resolve(failure('invalid_pin'))

      return safely(async () => {
        const { error } = await client.rpc('create_pin', { p_pin: pin })
        return error ? normalizeError(error) : success(null)
      })
    },

    verifyPin(pin) {
      if (!isValidPin(pin)) return Promise.resolve(failure('invalid_pin'))

      return safely(async () => {
        const { data, error } = await client.rpc('verify_pin', { p_pin: pin })
        if (error) return normalizeError(error)
        if (!pinStatuses.has(data)) return failure('unexpected_response')
        return success(data)
      })
    },

    resetPin(pin) {
      if (!isValidPin(pin)) return Promise.resolve(failure('invalid_pin'))

      return safely(async () => {
        const { error } = await client.rpc('reset_pin', { p_pin: pin })
        return error ? normalizeError(error) : success(null)
      })
    },
  }
}

async function withConfiguredClient<T>(
  operation: (access: AuthDataAccess) => Promise<AuthDataResult<T>>,
): Promise<AuthDataResult<T>> {
  try {
    return await operation(createAuthDataAccess(getSupabaseClient()))
  } catch (error) {
    return normalizeError(error)
  }
}

export function sendPhoneOtp(
  phoneNumber: string,
): Promise<AuthDataResult<null>> {
  return withConfiguredClient((access) => access.sendPhoneOtp(phoneNumber))
}

export function verifyPhoneOtp(
  phoneNumber: string,
  token: string,
): Promise<AuthDataResult<Session>> {
  return withConfiguredClient((access) =>
    access.verifyPhoneOtp(phoneNumber, token),
  )
}

export function getCurrentSession(): Promise<
  AuthDataResult<Session | null>
> {
  return withConfiguredClient((access) => access.getCurrentSession())
}

export function signOut(): Promise<AuthDataResult<null>> {
  return withConfiguredClient((access) => access.signOut())
}

export function hasPin(): Promise<AuthDataResult<boolean>> {
  return withConfiguredClient((access) => access.hasPin())
}

export function createPin(pin: string): Promise<AuthDataResult<null>> {
  return withConfiguredClient((access) => access.createPin(pin))
}

export function verifyPin(
  pin: string,
): Promise<AuthDataResult<PinVerificationStatus>> {
  return withConfiguredClient((access) => access.verifyPin(pin))
}

export function resetPin(pin: string): Promise<AuthDataResult<null>> {
  return withConfiguredClient((access) => access.resetPin(pin))
}
