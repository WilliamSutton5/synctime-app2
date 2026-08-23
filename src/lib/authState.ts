import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types/timesheet'
import type { PinVerificationStatus } from './authData'

export type PinUnlockIssue = 'incorrect' | 'locked'
export type AccountCheckSource =
  | 'existing-session'
  | 'verified-otp'
  | 'pin-not-configured'

export interface CheckingSessionState {
  status: 'checking-session'
}

export interface PhoneEntryState {
  status: 'phone-entry'
}

export type OtpVerificationState =
  | {
      status: 'otp-verification'
      phone: string
      purpose: 'sign-in'
    }
  | {
      status: 'otp-verification'
      phone: string
      purpose: 'pin-recovery'
      session: Session
    }

export interface CheckingAccountState {
  status: 'checking-account'
  session: Session
  source: AccountCheckSource
}

export interface ProfileSetupState {
  status: 'profile-setup'
  session: Session
  afterSave: 'pin-setup' | 'unlocked'
}

export interface PinSetupState {
  status: 'pin-setup'
  session: Session
  profile: Profile
}

export interface PinUnlockState {
  status: 'pin-unlock'
  session: Session
  knownProfile?: Profile
  issue?: PinUnlockIssue
}

export interface PinRecoveryPhoneState {
  status: 'pin-recovery-phone'
  session: Session
}

export interface PinResetState {
  status: 'pin-reset'
  session: Session
}

export interface LoadingApplicationState {
  status: 'loading-application'
  session: Session
}

export interface UnlockedState {
  status: 'unlocked'
  session: Session
  profile: Profile
}

export type AuthRetryState =
  | CheckingSessionState
  | CheckingAccountState
  | LoadingApplicationState

export interface AuthenticationErrorState {
  status: 'authentication-error'
  message: 'authError' | 'loadError'
  retry: AuthRetryState
}

export type AuthenticationState =
  | CheckingSessionState
  | PhoneEntryState
  | OtpVerificationState
  | CheckingAccountState
  | ProfileSetupState
  | PinSetupState
  | PinUnlockState
  | PinRecoveryPhoneState
  | PinResetState
  | LoadingApplicationState
  | UnlockedState
  | AuthenticationErrorState

export type AuthenticationEvent =
  | { type: 'SESSION_RESOLVED'; session: Session | null }
  | { type: 'PHONE_OTP_SENT'; phone: string }
  | { type: 'OTP_BACK' }
  | { type: 'OTP_VERIFIED'; session: Session }
  | { type: 'ACCOUNT_RESOLVED'; hasPin: boolean; profile: Profile | null }
  | { type: 'PROFILE_SAVED'; profile: Profile }
  | { type: 'PIN_CREATED' }
  | { type: 'PIN_VERIFICATION_RESOLVED'; result: PinVerificationStatus }
  | { type: 'PIN_RESET' }
  | { type: 'APPLICATION_PROFILE_RESOLVED'; profile: Profile | null }
  | { type: 'LOCK' }
  | { type: 'START_PIN_RECOVERY' }
  | { type: 'SIGN_OUT_SUCCEEDED' }
  | { type: 'SESSION_LOST' }
  | {
      type: 'FLOW_FAILED'
      message: AuthenticationErrorState['message']
      retry: AuthRetryState
    }
  | { type: 'RETRY' }

export const initialAuthenticationState: AuthenticationState = {
  status: 'checking-session',
}

export function transitionAuthenticationState(
  state: AuthenticationState,
  event: AuthenticationEvent,
): AuthenticationState {
  if (event.type === 'SIGN_OUT_SUCCEEDED' || event.type === 'SESSION_LOST') {
    return { status: 'phone-entry' }
  }

  switch (event.type) {
    case 'SESSION_RESOLVED':
      return event.session
        ? {
            status: 'checking-account',
            session: event.session,
            source: 'existing-session',
          }
        : { status: 'phone-entry' }

    case 'PHONE_OTP_SENT':
      if (state.status === 'phone-entry') {
        return {
          status: 'otp-verification',
          phone: event.phone,
          purpose: 'sign-in',
        }
      }
      if (state.status === 'pin-recovery-phone') {
        return {
          status: 'otp-verification',
          phone: event.phone,
          purpose: 'pin-recovery',
          session: state.session,
        }
      }
      return state

    case 'OTP_BACK':
      if (state.status !== 'otp-verification') return state
      return state.purpose === 'pin-recovery'
        ? { status: 'pin-recovery-phone', session: state.session }
        : { status: 'phone-entry' }

    case 'OTP_VERIFIED':
      if (state.status !== 'otp-verification') return state
      return state.purpose === 'pin-recovery'
        ? { status: 'pin-reset', session: event.session }
        : {
            status: 'checking-account',
            session: event.session,
            source: 'verified-otp',
          }

    case 'ACCOUNT_RESOLVED':
      if (state.status !== 'checking-account') return state
      if (event.hasPin) {
        return {
          status: 'pin-unlock',
          session: state.session,
          knownProfile:
            state.source === 'verified-otp'
              ? (event.profile ?? undefined)
              : undefined,
        }
      }
      if (!event.profile) {
        return {
          status: 'profile-setup',
          session: state.session,
          afterSave: 'pin-setup',
        }
      }
      return {
        status: 'pin-setup',
        session: state.session,
        profile: event.profile,
      }

    case 'PROFILE_SAVED':
      if (state.status !== 'profile-setup') return state
      return state.afterSave === 'unlocked'
        ? {
            status: 'unlocked',
            session: state.session,
            profile: event.profile,
          }
        : {
            status: 'pin-setup',
            session: state.session,
            profile: event.profile,
          }

    case 'PIN_CREATED':
      if (state.status !== 'pin-setup') return state
      return {
        status: 'unlocked',
        session: state.session,
        profile: state.profile,
      }

    case 'PIN_VERIFICATION_RESOLVED':
      if (state.status !== 'pin-unlock') return state
      if (event.result === 'verified') {
        return state.knownProfile
          ? {
              status: 'unlocked',
              session: state.session,
              profile: state.knownProfile,
            }
          : { status: 'loading-application', session: state.session }
      }
      if (event.result === 'not_configured') {
        return {
          status: 'checking-account',
          session: state.session,
          source: 'pin-not-configured',
        }
      }
      return { ...state, issue: event.result }

    case 'PIN_RESET':
      return state.status === 'pin-reset'
        ? { status: 'loading-application', session: state.session }
        : state

    case 'APPLICATION_PROFILE_RESOLVED':
      if (state.status !== 'loading-application') return state
      return event.profile
        ? {
            status: 'unlocked',
            session: state.session,
            profile: event.profile,
          }
        : {
            status: 'profile-setup',
            session: state.session,
            afterSave: 'unlocked',
          }

    case 'LOCK':
      return state.status === 'unlocked'
        ? {
            status: 'pin-unlock',
            session: state.session,
            knownProfile: state.profile,
          }
        : state

    case 'START_PIN_RECOVERY':
      return state.status === 'pin-unlock'
        ? { status: 'pin-recovery-phone', session: state.session }
        : state

    case 'FLOW_FAILED':
      return {
        status: 'authentication-error',
        message: event.message,
        retry: event.retry,
      }

    case 'RETRY':
      return state.status === 'authentication-error' ? state.retry : state

  }
}
