import type { Session } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Profile } from '../types/timesheet'
import {
  initialAuthenticationState,
  transitionAuthenticationState,
  type AuthenticationState,
} from './authState'

const session = { user: { id: 'employee-1' } } as Session
const profile: Profile = {
  id: 'employee-1',
  fullName: 'Elena Rivera',
  createdAt: '2026-08-23T12:00:00Z',
  updatedAt: '2026-08-23T12:00:00Z',
}

function checkingAccount(source: 'existing-session' | 'verified-otp') {
  return {
    status: 'checking-account',
    session,
    source,
  } satisfies AuthenticationState
}

describe('authentication state flow', () => {
  it('routes no Supabase session to phone login', () => {
    expect(
      transitionAuthenticationState(initialAuthenticationState, {
        type: 'SESSION_RESOLVED',
        session: null,
      }),
    ).toEqual({ status: 'phone-entry' })
  })

  it('routes a valid session with an existing PIN to PIN unlock', () => {
    const checking = transitionAuthenticationState(
      initialAuthenticationState,
      { type: 'SESSION_RESOLVED', session },
    )
    const state = transitionAuthenticationState(
      checking,
      { type: 'ACCOUNT_RESOLVED', hasPin: true, profile: null },
    )

    expect(state).toEqual({
      status: 'pin-unlock',
      session,
      knownProfile: undefined,
    })
  })

  it('loads the application profile only after a returning PIN is verified', () => {
    const locked: AuthenticationState = { status: 'pin-unlock', session }
    const loading = transitionAuthenticationState(locked, {
      type: 'PIN_VERIFICATION_RESOLVED',
      result: 'verified',
    })

    expect(loading).toEqual({ status: 'loading-application', session })
    expect(
      transitionAuthenticationState(loading, {
        type: 'APPLICATION_PROFILE_RESOLVED',
        profile,
      }),
    ).toEqual({ status: 'unlocked', session, profile })
  })

  it('routes no profile and no PIN to profile setup', () => {
    const state = transitionAuthenticationState(
      checkingAccount('verified-otp'),
      { type: 'ACCOUNT_RESOLVED', hasPin: false, profile: null },
    )

    expect(state).toMatchObject({
      status: 'profile-setup',
      afterSave: 'pin-setup',
    })
  })

  it('routes an existing profile without a PIN to PIN setup', () => {
    const state = transitionAuthenticationState(
      checkingAccount('verified-otp'),
      { type: 'ACCOUNT_RESOLVED', hasPin: false, profile },
    )

    expect(state).toEqual({ status: 'pin-setup', session, profile })
  })

  it('routes a newly saved profile to PIN setup before unlocking', () => {
    const state: AuthenticationState = {
      status: 'profile-setup',
      session,
      afterSave: 'pin-setup',
    }

    expect(
      transitionAuthenticationState(state, { type: 'PROFILE_SAVED', profile }),
    ).toEqual({ status: 'pin-setup', session, profile })
  })

  it('unlocks after successful PIN verification', () => {
    const state: AuthenticationState = {
      status: 'pin-unlock',
      session,
      knownProfile: profile,
    }

    expect(
      transitionAuthenticationState(state, {
        type: 'PIN_VERIFICATION_RESOLVED',
        result: 'verified',
      }),
    ).toEqual({ status: 'unlocked', session, profile })
  })

  it('keeps an incorrect PIN locked with an error state', () => {
    const state: AuthenticationState = { status: 'pin-unlock', session }
    expect(
      transitionAuthenticationState(state, {
        type: 'PIN_VERIFICATION_RESOLVED',
        result: 'incorrect',
      }),
    ).toEqual({ status: 'pin-unlock', session, issue: 'incorrect' })
  })

  it('keeps a temporarily locked PIN locked with lockout state', () => {
    const state: AuthenticationState = { status: 'pin-unlock', session }
    expect(
      transitionAuthenticationState(state, {
        type: 'PIN_VERIFICATION_RESOLVED',
        result: 'locked',
      }),
    ).toEqual({ status: 'pin-unlock', session, issue: 'locked' })
  })

  it('routes a not-configured PIN result through the setup decision', () => {
    const state: AuthenticationState = { status: 'pin-unlock', session }
    expect(
      transitionAuthenticationState(state, {
        type: 'PIN_VERIFICATION_RESOLVED',
        result: 'not_configured',
      }),
    ).toEqual({
      status: 'checking-account',
      session,
      source: 'pin-not-configured',
    })
  })

  it('unlocks after successful PIN creation', () => {
    const state: AuthenticationState = {
      status: 'pin-setup',
      session,
      profile,
    }
    expect(
      transitionAuthenticationState(state, { type: 'PIN_CREATED' }),
    ).toEqual({ status: 'unlocked', session, profile })
  })

  it('returns to phone login after sign out', () => {
    const state: AuthenticationState = {
      status: 'unlocked',
      session,
      profile,
    }
    expect(
      transitionAuthenticationState(state, { type: 'SIGN_OUT_SUCCEEDED' }),
    ).toEqual({ status: 'phone-entry' })
  })

  it('locks while preserving the underlying session', () => {
    const state: AuthenticationState = {
      status: 'unlocked',
      session,
      profile,
    }
    expect(transitionAuthenticationState(state, { type: 'LOCK' })).toEqual({
      status: 'pin-unlock',
      session,
      knownProfile: profile,
    })
  })

  it('returns to phone authentication when the session is lost', () => {
    const state: AuthenticationState = {
      status: 'unlocked',
      session,
      profile,
    }
    expect(
      transitionAuthenticationState(state, { type: 'SESSION_LOST' }),
    ).toEqual({ status: 'phone-entry' })
  })

  it('routes recovery OTP verification to PIN reset', () => {
    const unlock: AuthenticationState = { status: 'pin-unlock', session }
    const recovery = transitionAuthenticationState(unlock, {
      type: 'START_PIN_RECOVERY',
    })
    const otp = transitionAuthenticationState(recovery, {
      type: 'PHONE_OTP_SENT',
      phone: '+12125550100',
    })

    expect(
      transitionAuthenticationState(otp, {
        type: 'OTP_VERIFIED',
        session,
      }),
    ).toEqual({ status: 'pin-reset', session })
  })
})
