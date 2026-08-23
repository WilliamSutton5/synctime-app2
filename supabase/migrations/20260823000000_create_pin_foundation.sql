-- SyncTime protected PIN foundation
--
-- This migration intentionally adds database support only. The application UI
-- and authentication state flow are implemented in a later step.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create type public.pin_verification_status as enum (
  'verified',
  'incorrect',
  'locked',
  'not_configured'
);

revoke all on type public.pin_verification_status from public;
grant usage on type public.pin_verification_status to authenticated;

create table private.pin_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null check (pin_hash <> ''),
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pin_credentials_attempt_range check (
    failed_attempts between 0 and 5
  ),
  constraint pin_credentials_lock_consistency check (
    (locked_until is null and failed_attempts between 0 and 4)
    or (locked_until is not null and failed_attempts = 5)
  )
);

comment on table private.pin_credentials is
  'Private salted PIN hashes and server-enforced verification lock state.';
comment on column private.pin_credentials.pin_hash is
  'bcrypt hash produced and compared only inside privileged database functions.';

alter table private.pin_credentials enable row level security;

revoke all on table private.pin_credentials from public;
revoke all on table private.pin_credentials from anon, authenticated;

create trigger pin_credentials_set_updated_at
before update on private.pin_credentials
for each row execute function public.set_updated_at();

-- Supabase signs the JWT claims returned by auth.jwt(). Its AMR entries contain
-- the authentication method and the time that method was completed. Supabase
-- currently reports all one-time-password channels as "otp", so PostgreSQL
-- cannot distinguish SMS from email OTP or magic-link OTP by AMR alone. Requiring
-- both a recent OTP entry and a nonempty phone claim is the strongest clean
-- database-only boundary. Phone must remain the only enabled OTP channel for
-- this check to be an exact proof of recent SMS verification.
create function private.has_recent_phone_otp()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with token as (
    select (select auth.jwt()) as claims
  ),
  amr_entries as (
    select entry.value
    from token
    cross join lateral pg_catalog.jsonb_array_elements(
      case
        when pg_catalog.jsonb_typeof(token.claims -> 'amr') = 'array'
          then token.claims -> 'amr'
        else '[]'::jsonb
      end
    ) as entry(value)
  )
  select
    coalesce(
      (select (token.claims ->> 'phone') <> '' from token),
      false
    )
    and exists (
      select 1
      from amr_entries
      where pg_catalog.jsonb_typeof(amr_entries.value) = 'object'
        and amr_entries.value ->> 'method' = 'otp'
        and case
          when amr_entries.value ->> 'timestamp' ~ '^[0-9]{1,12}$'
            then pg_catalog.to_timestamp(
              (amr_entries.value ->> 'timestamp')::double precision
            )
          else null
        end >= pg_catalog.now() - interval '15 minutes'
        and case
          when amr_entries.value ->> 'timestamp' ~ '^[0-9]{1,12}$'
            then pg_catalog.to_timestamp(
              (amr_entries.value ->> 'timestamp')::double precision
            )
          else null
        end <= pg_catalog.now() + interval '1 minute'
    );
$$;

revoke all on function private.has_recent_phone_otp() from public;
revoke all on function private.has_recent_phone_otp() from anon, authenticated;

-- SECURITY DEFINER is required for the four public RPCs because normal browser
-- roles deliberately have no access to the private table. Each function fixes
-- search_path, schema-qualifies its objects, and derives identity from auth.uid().
create function public.has_pin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from private.pin_credentials
      where pin_credentials.user_id = (select auth.uid())
    );
$$;

create function public.create_pin(p_pin text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception using
      errcode = '22023',
      message = 'PIN_MUST_BE_FOUR_DIGITS';
  end if;

  if not private.has_recent_phone_otp() then
    raise exception using
      errcode = 'P0001',
      message = 'RECENT_PHONE_OTP_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'PROFILE_REQUIRED';
  end if;

  insert into private.pin_credentials (user_id, pin_hash)
  values (
    current_user_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10))
  )
  on conflict (user_id) do nothing;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'PIN_ALREADY_CONFIGURED';
  end if;
end;
$$;

create function public.verify_pin(p_pin text)
returns public.pin_verification_status
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  stored_pin_hash text;
  consecutive_failures smallint;
  current_lock_expiration timestamptz;
  verification_time timestamptz := pg_catalog.clock_timestamp();
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  select pin_hash, failed_attempts, locked_until
  into stored_pin_hash, consecutive_failures, current_lock_expiration
  from private.pin_credentials
  where pin_credentials.user_id = current_user_id
  for update;

  if not found then
    return 'not_configured'::public.pin_verification_status;
  end if;

  if current_lock_expiration is not null
    and current_lock_expiration > verification_time then
    return 'locked'::public.pin_verification_status;
  end if;

  if current_lock_expiration is not null then
    consecutive_failures := 0;
  end if;

  if p_pin is not null
    and p_pin ~ '^[0-9]{4}$'
    and stored_pin_hash = extensions.crypt(p_pin, stored_pin_hash) then
    update private.pin_credentials
    set failed_attempts = 0,
        locked_until = null
    where pin_credentials.user_id = current_user_id;

    return 'verified'::public.pin_verification_status;
  end if;

  consecutive_failures := consecutive_failures + 1;

  if consecutive_failures >= 5 then
    update private.pin_credentials
    set failed_attempts = 5,
        locked_until = verification_time + interval '15 minutes'
    where pin_credentials.user_id = current_user_id;

    return 'locked'::public.pin_verification_status;
  end if;

  update private.pin_credentials
  set failed_attempts = consecutive_failures,
      locked_until = null
  where pin_credentials.user_id = current_user_id;

  return 'incorrect'::public.pin_verification_status;
end;
$$;

create function public.reset_pin(p_pin text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception using
      errcode = '22023',
      message = 'PIN_MUST_BE_FOUR_DIGITS';
  end if;

  if not private.has_recent_phone_otp() then
    raise exception using
      errcode = 'P0001',
      message = 'RECENT_PHONE_OTP_REQUIRED';
  end if;

  update private.pin_credentials
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      failed_attempts = 0,
      locked_until = null
  where pin_credentials.user_id = current_user_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'PIN_NOT_CONFIGURED';
  end if;
end;
$$;

revoke all on function public.has_pin() from public;
revoke all on function public.create_pin(text) from public;
revoke all on function public.verify_pin(text) from public;
revoke all on function public.reset_pin(text) from public;

revoke all on function public.has_pin() from anon, authenticated;
revoke all on function public.create_pin(text) from anon, authenticated;
revoke all on function public.verify_pin(text) from anon, authenticated;
revoke all on function public.reset_pin(text) from anon, authenticated;

grant execute on function public.has_pin() to authenticated;
grant execute on function public.create_pin(text) to authenticated;
grant execute on function public.verify_pin(text) to authenticated;
grant execute on function public.reset_pin(text) to authenticated;

comment on function public.has_pin() is
  'Reports whether the current authenticated user has configured a PIN.';
comment on function public.create_pin(text) is
  'Creates the current user PIN after profile setup and recent phone OTP authentication.';
comment on function public.verify_pin(text) is
  'Atomically verifies the current user PIN and enforces five-attempt lockout.';
comment on function public.reset_pin(text) is
  'Replaces the current user PIN after recent phone OTP authentication.';
