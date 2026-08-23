# SyncTime

SyncTime is a simple, mobile-first employee timesheet application. Employees
enter hours for a semimonthly pay period, save drafts, review and submit their
timesheet, and print or save the submitted record as a PDF. The complete
employee interface is available in English and Spanish.

The authoritative authentication requirement is first-time phone/SMS identity
verification followed by a simple 4-digit PIN for normal returning access. SMS
also supports forgotten-PIN recovery and necessary new-device verification. The
repository's earlier SMS-on-every-login implementation does not yet satisfy
this clarified requirement; its replacement session/PIN design must be
explained and approved before authentication implementation resumes.

This repository contains the Version 1 application. It is not deployed, and no
live Supabase project is configured by the repository itself.

## Version 1 functionality

- Planned authentication: first-time Supabase phone OTP verification, full-name
  profile and 4-digit PIN setup, then PIN-based normal returning access.
- Planned recovery: SMS identity verification followed by creation of a new PIN.
- Current or manually selected year, month, and semimonthly period.
- Correct date generation for the 1st–15th and 16th–month-end, including leap
  years and weekends.
- Regular, Holiday, Sick Leave, Vacation Leave, and Overtime entries on every
  date, including multiple categories on one date.
- Immediate daily, category, and grand totals.
- Explicit draft saving and restoration of previous periods.
- Review, confirmation, submission timestamp, and success flow.
- Read-only submitted timesheets with a simple edit-and-resubmit path.
- Print-optimized submitted timesheet and browser Print / Save as PDF.
- Centralized English/Spanish translations with a remembered local preference.
- Row Level Security policies limiting each employee to their own data.
- Installable PWA app shell without offline time editing, API caching, or
  background synchronization.
- A development-only demo mode with realistic in-memory employee and timesheet
  data for previewing the complete post-authentication workflow without
  Supabase.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the authoritative requirements and
future-feature boundaries.

## Technology

- React and TypeScript
- Vite
- Supabase Auth, PostgreSQL, and Row Level Security
- Vitest and ESLint
- Plain responsive CSS

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project
- An SMS provider supported by Supabase for real phone verification

## Local setup

### Preview without Supabase

To open the complete employee interface with realistic mock data:

```bash
npm install
npm run dev:demo
```

Open the local URL printed by Vite. The current pay period is an editable draft;
the immediately previous pay period is a submitted example. You can change
hours, save in memory, switch periods, edit the submitted example, switch
English/Spanish, review and submit, and open the print/PDF view. Use **Reset
demo** in the header to restore the original examples.

Demo mode starts after authentication and does not simulate or implement the
pending 4-digit PIN design. Its mock data exists only in memory and resets when
the development server page is reloaded. It is gated by both Vite's development
flag and the explicit `demo` mode, so a production build cannot enable it and
the normal `npm run dev` command continues to use the real Supabase path.

### Connect the real Supabase path

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a new hosted Supabase project. Do not use a production project until
   the application and organizational configuration have been reviewed.

3. Apply the database migration in
   `supabase/migrations/20260818000000_create_synctime_schema.sql`.

   For a simple first setup, open the Supabase SQL Editor, paste the full file,
   review it, and run it once. The migration creates `profiles`, `timesheets`,
   and `time_entries`, their constraints and timestamp triggers, and all Version
   1 RLS policies.

4. When authentication implementation is explicitly resumed and its session/PIN
   design has been approved, use the Supabase dashboard to enable Phone and
   configure an SMS provider for first-time verification, PIN recovery, and
   necessary new-device verification. Do not treat SMS as the normal returning
   login. Review SMS rate limits, CAPTCHA, cost controls, and applicable legal
   requirements before production.

5. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

6. In Supabase Project Settings, copy the project URL and the browser-safe
   publishable key into `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
   ```

   Never use the secret key or `service_role` key here. Browser access is
   protected by the migration's RLS policies.

7. Start the application:

   ```bash
   npm run dev
   ```

Vite prints the local URL in the terminal. Restart it after changing environment
variables.

Supabase references:

- [Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- [Securing your data](https://supabase.com/docs/guides/database/secure-data)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Project commands

```bash
npm run dev       # Start the local development server
npm run dev:demo  # Start the local mock-data preview (no Supabase required)
npm run build     # Type-check and create the production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
npm test          # Run the automated tests once
npm run test:watch
```

## Data model and security

`profiles` stores only the authenticated UUID and employee name. `timesheets`
stores one unique record for each employee/year/month/pay-period combination.
`time_entries` stores the five numeric hour values for a date. Daily and period
totals are calculated in the application and are not duplicated in the
database. Submission timestamps are assigned by PostgreSQL rather than trusting
the employee device's clock.

All application tables have RLS enabled. Policies use `auth.uid()` to restrict
profiles and timesheets to their owner and time entries to the owner of the
parent timesheet. Entry mutations are permitted only while that parent is a
draft, so submitted records stay read-only until deliberately returned to draft
for correction. The unauthenticated database role is explicitly denied table
access. The frontend uses only a browser-safe project key; it never contains a
service-role credential.

## Code layout

```text
src/components/  Reusable timesheet and application UI
src/i18n/        English/Spanish dictionaries and language state
src/lib/         Dates, calculations, Supabase client, and persistence
src/pages/       Authentication, editor, review, print, and success views
src/types/       Application and database TypeScript types
supabase/        Versioned database migration
```

## PWA behavior

The production build includes a web app manifest and a minimal generated service
worker so SyncTime can be added to a supported phone's home screen. The service
worker precaches only the compiled application shell. It does not runtime-cache
Supabase requests, enable offline timesheet editing, or perform background sync.
The eventual ideal daily flow is `Tap SyncTime → Enter 4-digit PIN → Timesheet`.
The future session/PIN design will determine its exact network behavior; Version
1 does not include offline authentication, offline time editing, or background
sync. Employees need a network connection to load, save, or submit time.

## Not included in Version 1

There is no supervisor/admin workflow, approval or rejection, payroll or pay
rates, leave balances, automatic overtime, Comp Time, multi-organization model,
reporting dashboard, export, email, or offline data synchronization. Production
hosting and production Supabase/SMS configuration are also intentionally not
created by this repository.
