# SyncTime

SyncTime is a local-first, bilingual employee timesheet for phones and desktop
browsers. An employee enters a full name once, records hours, saves drafts on
that device, reviews and finalizes the sheet, then prints or saves it as a PDF
to forward to the manager.

There is no account, sign-in, PIN, backend, or automatic delivery. The
authoritative requirements are in [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Version 1 features

- First-use full-name setup with a later Edit name action.
- English/Spanish toggle with the preference saved locally.
- Year, month, and semi-monthly pay-period selection.
- Every calendar date, including weekends.
- Regular, Holiday, Sick Leave, Vacation Leave, and Overtime entries.
- Automatic daily, category, and grand totals.
- Explicit local Save action and separate records for multiple pay periods.
- Concise review that hides zero-hour dates and categories.
- Local finalization, correction, and re-finalization.
- Professional browser Print / Save as PDF view.
- Installable PWA app shell.
- Development-only demo with realistic sample data.

## Technology

- React 19
- TypeScript
- Vite
- Browser `localStorage`
- `vite-plugin-pwa`
- Vitest and ESLint

The app has no runtime environment variables and no external data service.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. On the first visit, choose English or
Español and enter an employee name. The normal app then stores that name and
saved timesheets in the current browser.

No `.env.local` is needed. If one remains from an earlier version, it is ignored
by the application and can be deleted manually.

### Sample-data demo

```bash
npm run dev:demo
```

Demo mode skips name setup and opens the timesheet for María Rodriguez with an
in-progress current period and a finalized previous period. Demo edits stay in
memory and reset when the page reloads. The mode is guarded by Vite development
mode, so it cannot be turned on in a production build.

## Local persistence

SyncTime stores these small records in browser `localStorage`:

- Employee full name and a stable local employee identifier.
- Saved draft and finalized timesheets, keyed by employee identifier, year,
  month, and pay period.
- Selected language.

Editing the saved name keeps the local identifier, so existing pay periods stay
available under the updated name. Calculated totals are derived from saved hour
entries rather than stored redundantly.

This storage is specific to the current device, browser, and browser profile. It
does not sync or back up data. Clearing site/app data, uninstalling the PWA, or
using private browsing may remove saved names and timesheets. Employees should
keep the finalized PDF as the durable record they forward to management.

## Finalize and PDF workflow

`Finalize` means that the employee confirmed the timesheet locally. It does not
mean SyncTime sent the sheet, that a manager received it, or that it was
approved.

After finalization, choose **Print / Save as PDF**. SyncTime uses the browser's
print interface and print-specific CSS. The exact Save as PDF/share controls
vary by phone and browser; the employee then attaches or shares the resulting
PDF through their normal communication application. If real-device testing
shows this flow is too awkward, direct client-side PDF generation is a sensible
future enhancement, but Version 1 intentionally avoids a large PDF library.

## PWA behavior

Production builds include a web app manifest, icons, and a generated service
worker so supported phones can add SyncTime to the home screen. The service
worker precaches the compiled app shell only. Timesheets remain in
`localStorage`; there is no background sync or third-party transmission.

## Project structure

```text
src/components/   Shared interface and timesheet document components
src/demo/         Development-only sample profile and in-memory data source
src/i18n/         Centralized English/Spanish translations
src/lib/          Date, calculation, review, mode, and local-persistence logic
src/pages/        Name setup, editor, review, finalization, and print views
src/types/        Application TypeScript types
public/           PWA icons
```

## Checks

```bash
npm test
npm run lint
npm run build
git diff --check
```

`npm run build` includes the TypeScript project build before Vite creates the
production bundle.

## Privacy and boundaries

SyncTime is limited to basic timekeeping data. Do not add pay rates, wages,
banking information, Social Security numbers, tax data, direct-deposit details,
or other confidential payroll information. The app provides no user-level
access control and does not send timesheets to management or third parties.

Previously created external backend resources are not used by this repository.
They should only be paused or deleted later as a separate, deliberate
operational action after any desired retention or billing review.
