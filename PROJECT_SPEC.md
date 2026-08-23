# SyncTime Product Specification

## 1. Product summary

SyncTime is a simple, mobile-first employee timekeeping web application for one
organization and one office. An employee should be able to authenticate, enter
hours for a semimonthly pay period, save a draft, review and submit it, and print
or save the submitted timesheet as a PDF. The interface supports English and
Spanish.

The governing product principle is **functional first, sophisticated later**.
When several approaches meet a requirement, prefer the one that is simpler,
more understandable, easier to maintain, secure, and comfortable to use on a
phone. SyncTime is not a payroll, workforce-management, or multi-tenant system.

Primary workflow:

> Log in → Enter hours → Save → Review → Submit → Print

The working name is SyncTime, but implementation must not make future renaming
difficult.

## 2. Version 1 scope

### Required

- Responsive, phone-first web application that also works on desktop.
- First-time identity verification by phone number and SMS one-time code.
- First-time self-registration with a minimal full-name profile and a simple
  4-digit PIN.
- Low-friction returning access through the employee's 4-digit PIN, without an
  SMS challenge during ordinary repeat use.
- SMS-based PIN recovery and identity re-verification when a new device or lost
  authentication state makes it necessary.
- Year, month, and semimonthly pay-period selection.
- Automatic generation of every date in a selected period, including weekends.
- Hour entry for Regular, Holiday, Sick Leave, Vacation Leave, and Overtime.
- More than one hour category on a date.
- Immediate derived daily, category, and grand totals.
- Explicit draft saving and restoration of previously saved timesheets.
- Review and confirmation before submission.
- `draft` and `submitted` statuses with a submission timestamp.
- A professional print view for submitted timesheets, using browser printing and
  print CSS so the user can print or save as PDF.
- A centralized English/Spanish translation system and locally persisted
  language preference.
- Database-level security so employees can access only their own records.

### Preferred when simple

- Default to the current pay period.
- Let an employee reopen, edit, and resubmit a submitted timesheet. Editing
  returns it to draft without revision-history or approval machinery.
- Use the period selectors as the initial way to reopen prior timesheets.
- Add simple installable PWA behavior after the core web workflow is reliable,
  without offline data editing or background synchronization.

### Explicitly deferred

Do not implement these without a later explicit request:

- Supervisors, administrators, approval/rejection, dashboards, invitations,
  departments, roles, organizations, tenants, or office management.
- Leave balances or accrual, payroll, pay rates, wages, eligibility rules, or
  automatic overtime calculations.
- Comp Time.
- Reporting dashboards, analytics, revision history, Excel/CSV export, automatic
  PDF email, notifications, or a dedicated history dashboard.
- Native mobile apps, offline editing, background sync, or complex caching.
- Dark mode, custom themes, advanced branding, or decorative animation.

## 3. Users, privacy, and boundaries

Version 1 has one user type: employees entering their own time. The application
serves a single organization and office and has no in-app approval workflow.

Store only data required for timekeeping. Do not store Social Security numbers,
banking or direct-deposit data, salary, pay rate, wages, or tax information.
The phone number is an authentication attribute used for initial identity
verification and recovery. Keep Supabase Auth authoritative for it rather than
duplicating it in application tables.

## 4. Technology and architecture

- Frontend: React, TypeScript, and Vite.
- Backend: Supabase Auth and PostgreSQL with Row Level Security.
- Styling: straightforward responsive CSS; no large UI framework without a
  demonstrated need.
- Testing: lightweight automated tests, especially for pure date and calculation
  logic.
- Deployment is a separate task. Do not create production hosting, DNS, secrets,
  or infrastructure unless explicitly requested.

Keep the architecture conventional and proportional to this small application.
Small components, reusable pure utilities, and focused data-access helpers are
appropriate. Enterprise repository/service/domain layers and dependency
injection are not.

Suggested responsibility areas, created only when used:

```text
src/
  components/   reusable UI pieces
  pages/        authentication, profile, editor, review, success/print views
  lib/          Supabase configuration, date logic, calculations, persistence
  i18n/         English and Spanish translations
  types/        application data types
```

## 5. Authentication and profile flow

Authentication must be intentionally simple and proportionate to SyncTime's
low-sensitivity timekeeping data. Supabase remains the authentication
infrastructure, but SMS is for establishing or recovering identity rather than
the normal daily login experience.

### First-time registration

Expected flow:

> Phone Number → SMS Verification → Full Name → Create 4-Digit PIN → Timesheet

1. Employee enters their phone number.
2. Supabase sends an SMS one-time code through its configured provider.
3. Employee enters the code to verify ownership of the phone number.
4. The app checks for a profile associated with the verified Supabase identity.
5. If no profile exists, ask for the employee's full name and save it.
6. Employee creates a simple 4-digit PIN.
7. Employee enters the timesheet application.

Keep profile creation before PIN creation unless a concrete technical or UX
reason justifies reversing them. Explain that reason before changing the flow.

### Normal returning use

Expected flow:

> Open SyncTime → Enter 4-Digit PIN → Timesheet

The PIN is the normal everyday access experience. Employees should not normally
receive an SMS each time they open SyncTime. The application may retain an
underlying Supabase authenticated session where needed, but employees should not
need to understand or manage that session behavior.

### Forgot PIN and recovery

Expected flow:

> Forgot PIN → Phone Number / SMS Verification → Create New PIN → Timesheet

SMS re-establishes the employee's identity before a replacement PIN is created.
Keep recovery direct and understandable.

### New devices and lost authentication state

If SyncTime cannot safely associate a device with the employee's existing
registration, require SMS verification of the registered phone number before
establishing or using the PIN on that device. Do not require this verification
during ordinary repeat use when the association remains valid.

### Security boundary and future design work

- Never store the 4-digit PIN in plaintext or expose it or another secret in
  frontend code.
- Do not create a custom plaintext PIN authentication database.
- Prevent trivial unlimited PIN attempts against arbitrary employee accounts
  with a straightforward server-enforced attempt limit or equivalent
  proportionate protection.
- Do not overengineer PIN security for this low-sensitivity application.
- Do not add passwords, email authentication, social login, MFA, authenticator
  applications, biometrics, invitation workflows, or offline authentication.
- Never put a Supabase service-role key or another privileged secret in browser
  code.

The exact Supabase session/PIN mechanism is intentionally undecided. When the
authentication implementation phase is explicitly authorized, first propose a
simple, technically sound design in which Supabase phone verification
establishes or recovers identity and the PIN gates recurring access. Explain the
session lifecycle, protected PIN verification, attempt limiting, recovery, and
new-device behavior before making major architectural changes. Do not replace
Supabase with an entirely custom authentication system.

Real SMS delivery and the Supabase project require later manual configuration
and must be documented when authentication implementation begins.

The profile contains only:

- Authenticated user UUID (primary key).
- Required full name.
- Created timestamp.
- Updated timestamp where useful.

## 6. Pay-period and calendar rules

The two pay periods are:

- `first_half`: calendar days 1–15.
- `second_half`: calendar days 16–the final day of the month.

The UI labels should be equivalent to `1st–15th` and `16th–End of Month` in the
selected language. Generate all calendar dates, including Saturdays and Sundays,
and correctly handle 28-, 29-, 30-, and 31-day months. The current period may be
the default, but employees must be able to change the year, month, and period.

For each selected employee/year/month/period combination, load the existing
timesheet or begin a new in-memory draft. Never create duplicate timesheets for
the same combination.

Keep calendar logic reusable and outside presentation components. It should
cover month length, pay-period date generation, current-period selection, ISO
date creation, day-of-week formatting, and localized display formatting.

## 7. Hours and calculations

Each date has five employee-entered values:

1. Regular
2. Holiday
3. Sick Leave
4. Vacation Leave
5. Overtime

Inputs accept reasonable decimal values such as `7.5`, treat blanks as zero in
calculations, and reject negatives and malformed nonnumeric values. Do not add
rules about daily or weekly maximums, eight-hour schedules, holidays, weekends,
or overtime eligibility. Overtime is entered manually. SyncTime does not track
leave balances.

Daily total:

```text
regular + holiday + sick + vacation + overtime
```

The period summary derives a total for every category and a grand total from the
entries. Totals are never entered by users and normally are not stored in the
database. Put calculation logic in reusable pure functions and use the same
functions in edit, review, and print views.

## 8. Mobile experience and accessibility

Design for modern phone browsers first, with a useful desktop layout for
development and printing. Do not reproduce a wide desktop spreadsheet as the
entry experience. Prefer compact, clearly dated day sections or cards that make
all five inputs and the daily total easy to scan without horizontal scrolling.
Subtle weekend differentiation is acceptable.

Priorities:

- Large touch targets, readable text, clear numeric inputs, and minimal clutter.
- Obvious selectors, Save, and Review & Submit actions.
- Immediate totals, visible save/submission feedback, and useful loading states.
- Minimal navigation and no dense dashboard, sidebar, or hidden gestures.
- Semantic HTML, associated labels, sufficient contrast, keyboard usability,
  understandable button text, and status communication that does not rely only
  on color.
- Friendly localized errors rather than raw backend details or blank screens.

## 9. Draft, review, submission, correction, and history behavior

### Drafts

Saving is explicit. On Save, persist the timesheet and its entries and clearly
confirm success. A returning employee can select the period and see the restored
values. Complex autosave is not part of Version 1.

### Review and submission

`Review & Submit` opens a review view containing the employee name, period,
dates, entered categories, daily totals, category totals, and grand total. It
offers `Back to Edit` and `Confirm Submission`. Confirmation saves the current
entries, sets status to `submitted`, records `submitted_at`, and shows success.

### Corrections

Where implemented simply, a submitted sheet is initially read-only and offers
an Edit action. Saving a correction changes its status back to `draft` and clears
the old submission timestamp. The employee then reviews and submits again; the
timestamp updates. Do not add versioning, revisions, or approval chains.

### History

The year/month/period selectors are the Version 1 history interface. Do not add
a dedicated history dashboard.

## 10. Printing and PDF

Only submitted timesheets need a print action. Use the browser's print dialog
and print-specific CSS, not server-side PDF generation. The print layout may use
a traditional table and must include:

- Timesheet title, employee full name, and pay period.
- Every date and five hour categories.
- Daily totals, category totals, and grand total.
- Submission date when available.

Hide navigation and interactive controls in print. Automatic PDF emailing is
deferred.

## 11. Internationalization

Support exactly English and Spanish with an obvious `English | Español` switch.
Use a small centralized dictionary/helper rather than a large localization
framework. Persist the language to `localStorage` and format dates appropriately
where practical.

Translate meaningful UI copy, including authentication instructions, fields,
buttons, hour categories, period controls, status and confirmation messages,
errors, review labels, and print labels. Do not scatter hardcoded English user
text throughout components.

## 12. Database model

Core timekeeping data uses three primary application tables. Authentication
implementation may later add the minimum server-side support required for the
approved Supabase session/PIN design, but must not add a plaintext PIN column to
these tables or casually expand the timekeeping schema.

### `profiles`

- `id uuid primary key` matching the Supabase Auth user.
- `full_name text not null`.
- `created_at timestamptz`.
- `updated_at timestamptz`.

### `timesheets`

- `id uuid primary key`.
- `user_id uuid not null`.
- `year integer not null`.
- `month integer not null` (1–12).
- `pay_period text not null` constrained to `first_half` or `second_half`.
- `status text not null` constrained to `draft` or `submitted`.
- `submitted_at timestamptz null`.
- `created_at timestamptz`.
- `updated_at timestamptz`.
- Unique constraint on `(user_id, year, month, pay_period)`.

### `time_entries`

- `id uuid primary key`.
- `timesheet_id uuid not null` referencing `timesheets` with cascade deletion.
- `entry_date date not null`.
- Nonnegative decimal columns for regular, holiday, sick, vacation, and overtime
  hours, defaulting to zero.
- `created_at timestamptz`.
- `updated_at timestamptz`.
- Unique constraint on `(timesheet_id, entry_date)`.

Do not store derived totals.

## 13. Database security

Enable Row Level Security on all three application tables. Policies use
`auth.uid()` and allow an authenticated employee to select, insert where
applicable, and update only:

- Their own profile (`profiles.id = auth.uid()`).
- Their own timesheets (`timesheets.user_id = auth.uid()`).
- Entries whose parent timesheet belongs to them.

Security must not depend on hidden React UI or browser-provided IDs. Policies
should be readable and documented. Add no service-role access to frontend code.

## 14. Configuration and operations

Frontend Supabase configuration is provided through placeholder-only Vite
environment variables such as:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Secret-bearing local environment files must remain ignored. Never invent or
hardcode production values. Repository documentation must distinguish working
features from external/manual setup still required.

When authorized Supabase authentication work is reached, document the approved
session/PIN design plus the exact project, SQL migration, phone auth, SMS
provider, URL/redirect, recovery, attempt-limiting, and environment-variable
setup the developer must perform. Do not modify live Supabase resources or
deploy production infrastructure without explicit permission.

## 15. Testing and quality bar

Automate the most important pure logic without making testing a separate
project. Cover at minimum:

- First-half and second-half generation.
- February in common and leap years.
- 30- and 31-day months.
- Current-period detection.
- Daily, category, and grand totals.

Use TypeScript meaningfully, avoid `any` and unnecessary assertions, and favor
clear names and straightforward data flow. After implementation work, run the
relevant tests, lint checks, and production build. Preserve unrelated changes
and report checks and manual configuration still required.

## 16. Progressive Web App boundary

After core functionality is reliable, SyncTime may include a manifest, app
icons, and minimal safe app-shell behavior so it can be added to a phone home
screen. It must not cache authenticated API responses or implement offline
timesheet edits, background sync, or complex cache invalidation.

The intended eventual daily PWA flow is:

> Tap SyncTime on home screen → Enter 4-Digit PIN → Timesheet

This clarification does not move PWA work earlier or authorize offline
authentication architecture.

## 17. Implementation roadmap

1. Project guidance: repository inspection, `PROJECT_SPEC.md`, `AGENTS.md`.
2. Frontend foundation: React, TypeScript, Vite, structure, responsive base.
3. Core local logic/UI: types, dates, calculations, entry interface, totals.
4. Translation foundation: English/Spanish dictionaries and language toggle.
5. Supabase integration: client, environment shape, migration, RLS, persistence.
6. Authentication and profiles: propose and explain the Supabase session/PIN
   design first; after explicit implementation authorization, add first-time
   phone OTP, name and PIN setup, low-friction PIN return access, recovery, and
   new-device re-verification.
7. Draft persistence: create/load unique periods, save and restore entries.
8. Review and submission: confirmation, status, timestamp, success.
9. Corrections/history: edit and resubmit; selectors reopen prior periods.
10. Printing: print layout and browser Save as PDF.
11. PWA: installability only, without offline employee data behavior.
12. Final review: mobile UX, languages, accessibility, security, tests, build,
   documentation, and cleanup.

Build incrementally even when several phases are authorized together. Do not
silently extend the scope into deferred features.
