import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '../types/database'
import {
  createAuthDataAccess,
  isValidPin,
  type PinVerificationStatus,
} from './authData'

const session = { access_token: 'test-access-token' } as Session

function createClientMock() {
  const signInWithOtp = vi.fn().mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  })
  const verifyOtp = vi.fn().mockResolvedValue({
    data: { user: null, session },
    error: null,
  })
  const getSession = vi.fn().mockResolvedValue({
    data: { session },
    error: null,
  })
  const signOut = vi.fn().mockResolvedValue({ error: null })
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  const client = {
    auth: { signInWithOtp, verifyOtp, getSession, signOut },
    rpc,
  } as unknown as Pick<SupabaseClient<Database>, 'auth' | 'rpc'>

  return {
    access: createAuthDataAccess(client),
    getSession,
    rpc,
    signInWithOtp,
    signOut,
    verifyOtp,
  }
}

describe('phone OTP access', () => {
  it('requests an SMS OTP with a normalized phone number', async () => {
    const { access, signInWithOtp } = createClientMock()

    await expect(access.sendPhoneOtp(' +1 (212) 555-0100 ')).resolves.toEqual(
      { ok: true, data: null },
    )
    expect(signInWithOtp).toHaveBeenCalledWith({
      phone: '+12125550100',
      options: { shouldCreateUser: true },
    })
  })

  it('verifies an SMS OTP and returns the Supabase session', async () => {
    const { access, verifyOtp } = createClientMock()

    await expect(
      access.verifyPhoneOtp('+12125550100', ' 123456 '),
    ).resolves.toEqual({ ok: true, data: session })
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: '+12125550100',
      token: '123456',
      type: 'sms',
    })
  })

  it('returns the current Supabase-managed session and signs out through Auth', async () => {
    const { access, getSession, signOut } = createClientMock()

    await expect(access.getCurrentSession()).resolves.toEqual({
      ok: true,
      data: session,
    })
    await expect(access.signOut()).resolves.toEqual({ ok: true, data: null })
    expect(getSession).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledOnce()
  })
})

describe('PIN RPC access', () => {
  it('calls only the public PIN RPCs with the expected arguments', async () => {
    const { access, rpc } = createClientMock()
    rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: 'verified', error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    await access.hasPin()
    await access.createPin('1234')
    await access.verifyPin('1234')
    await access.resetPin('5678')

    expect(rpc).toHaveBeenNthCalledWith(1, 'has_pin')
    expect(rpc).toHaveBeenNthCalledWith(2, 'create_pin', { p_pin: '1234' })
    expect(rpc).toHaveBeenNthCalledWith(3, 'verify_pin', { p_pin: '1234' })
    expect(rpc).toHaveBeenNthCalledWith(4, 'reset_pin', { p_pin: '5678' })
  })

  it.each<PinVerificationStatus>([
    'verified',
    'incorrect',
    'locked',
    'not_configured',
  ])('maps the %s verification status', async (status) => {
    const { access, rpc } = createClientMock()
    rpc.mockResolvedValueOnce({ data: status, error: null })

    await expect(access.verifyPin('1234')).resolves.toEqual({
      ok: true,
      data: status,
    })
  })

  it.each(['', '123', '12345', '12a4', ' 1234', '１２３４'])(
    'rejects invalid four-digit PIN input: %j',
    async (pin) => {
      const { access, rpc } = createClientMock()

      expect(isValidPin(pin)).toBe(false)
      await expect(access.verifyPin(pin)).resolves.toMatchObject({
        ok: false,
        error: { code: 'invalid_pin' },
      })
      expect(rpc).not.toHaveBeenCalled()
    },
  )

  it('rejects an unknown RPC status as an unexpected response', async () => {
    const { access, rpc } = createClientMock()
    rpc.mockResolvedValueOnce({ data: 'unknown_status', error: null })

    await expect(access.verifyPin('1234')).resolves.toMatchObject({
      ok: false,
      error: { code: 'unexpected_response' },
    })
  })
})

describe('normalized errors', () => {
  it('normalizes Auth and RPC errors into the same predictable shape', async () => {
    const providerError = Object.assign(new Error('SMS rate limit exceeded'), {
      code: 'over_request_rate_limit',
      status: 429,
    })
    const { access, rpc, signInWithOtp } = createClientMock()
    signInWithOtp.mockResolvedValueOnce({ data: null, error: providerError })
    rpc.mockResolvedValueOnce({ data: null, error: providerError })

    const authResult = await access.sendPhoneOtp('+12125550100')
    const rpcResult = await access.hasPin()

    expect(authResult).toEqual(rpcResult)
    expect(authResult).toEqual({
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'Too many attempts. Wait a moment and try again.',
        debugMessage: 'SMS rate limit exceeded',
        providerCode: 'over_request_rate_limit',
        status: 429,
      },
    })
  })

  it('maps protected PIN RPC errors without exposing a raw error object', async () => {
    const { access, rpc } = createClientMock()
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'RECENT_PHONE_OTP_REQUIRED',
      },
    })

    await expect(access.resetPin('1234')).resolves.toEqual({
      ok: false,
      error: {
        code: 'recent_phone_otp_required',
        message: 'Recent phone verification is required to complete this action.',
        debugMessage: 'RECENT_PHONE_OTP_REQUIRED',
        providerCode: 'P0001',
        status: undefined,
      },
    })
  })
})
