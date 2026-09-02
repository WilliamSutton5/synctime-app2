# SyncTime Version 1 Product Specification

## 1. Product summary

SyncTime is a simple, bilingual, mobile-first timesheet application for one
organization and one office. It is a local-first tool, not an employee portal:
employees do not create accounts or sign in, and the app does not send
timesheets to a manager.

The Version 1 workflow is:

> Open SyncTime → enter a full name on first use → enter and save time → review
> and finalize → print or save as PDF → forward the PDF to the manager

The application must remain easy to open from a hosted URL or an installed PWA
on a modern phone. English and Spanish are equally supported.

## 2. Scope and privacy boundary

SyncTime records only basic timekeeping information:

- Employee full name.
- Pay-period selection.
- Daily hours by category.
- Local draft/finalized status and timestamps.

It must not collect pay rates, wages, banking details, Social Security numbers,
tax details, direct-deposit information, leave balances, or other confidential
payroll data.

Version 1 has no employee authentication, PIN, password, one-time-code flow,
central database, manager dashboard, approval workflow, automatic emailing, or
cross-device synchronization. It does not claim user-level access control.

## 3. Technical architecture

- React, TypeScript, and Vite.
- Responsive mobile-first CSS.
- Browser `localStorage` for the employee profile, language, timesheets, and
  local finalization state.
- A generated PWA manifest and app-shell service worker.
- Browser Print / Save as PDF for the finished document.
- Pure date, calculation, and review-filtering utilities.

No runtime environment variables or external backend services are required.
The service worker may cache the compiled application shell, but it must not
copy timesheet records into its cache. Timesheet data remains in browser
storage.

## 4. Startup and employee name

On first use, show the language toggle and ask for the employee's full name.
After the name is saved locally, continue directly to the timesheet. On later
visits in the same browser/device, load the name and timesheet workspace without
an account or sign-in screen.

The workspace must offer a simple Edit name action. Updating the name does not
require verification and retains the same local timesheet history.

Clearly disclose that local records can be lost if the employee clears browser
or installed-app data. Private/incognito browsing may not retain them reliably.

## 5. Timesheet periods and dates

Employees select:

- Year.
- Month.
- `1st–15th` or `16th–End of Month`.

Generate every calendar date in the selected period, including weekends. Handle
month length and leap years correctly. The current date determines the default
period.

Local records are distinguished by the stable local employee identity, year,
month, and pay period. Opening a saved period restores its entries without
overwriting other periods.

## 6. Hour entry and totals

Every editable date exposes these categories:

- Regular.
- Holiday.
- Sick Leave.
- Vacation Leave.
- Overtime.

Employees may enter multiple categories on the same date. Overtime is entered
manually. Inputs accept blank/zero values and decimal hours but not negative
hours.

Calculate automatically:

- Each daily total.
- A total for every category.
- The pay-period grand total.

Calculated totals do not need to be persisted separately because they can be
derived from entries.

## 7. Local save behavior

Keep an explicit Save action. Saving writes the current draft to `localStorage`
and confirms that it was saved on the device. A saved draft must reload after
the app closes or reloads in the same browser. Unsaved edits should warn before
switching periods or leaving the page where the browser permits it.

Local storage is device- and browser-specific. It provides no backup, server
sync, recovery after browser-data deletion, or automatic transfer to another
device.

## 8. Review and finalization

Use the term **Finalize**, not **Submit**, because SyncTime does not transmit the
record. The flow is:

> Timesheet → Review & Finalize → accuracy confirmation → finalized locally

On the review page:

- Hide dates whose daily total is zero.
- For visible dates, hide hour categories whose value is zero.
- Keep the daily total for each visible date.
- Hide zero-value categories in the period summary.
- Always show the grand total.

The editable screen continues to show every date and category.

Finalization saves the latest entries, marks the local record `finalized`, and
records a timestamp. Finalized means only that the employee completed the local
record; it does not mean the manager received or approved it. A finalized sheet
is initially read-only. The employee may edit it, which returns the record to
draft when saved, then review and finalize it again. Do not create approval
states.

## 9. Print and PDF output

A finalized timesheet offers Print / Save as PDF. The print document includes:

- SyncTime employee-timesheet title.
- Employee full name.
- Pay-period range.
- Status and finalization date.
- Calendar dates and hour entries.
- Daily totals, category totals, and grand total.

Print CSS removes application navigation and controls. Version 1 uses the
browser's print interface; desktop and mobile browsers may label or arrange the
Save as PDF/share steps differently. Employees must save the PDF and forward it
through their normal communication application. SyncTime does not email it.

If field testing shows that mobile browser printing is too confusing, a future
small enhancement may generate a client-side PDF directly. Do not add a large
PDF dependency without that evidence.

## 10. English and Spanish

All meaningful employee-facing copy belongs in the centralized translation
dictionary. This includes name setup, period controls, hour categories, save
feedback, review, finalization, correction, print/PDF guidance, errors, and
loading states. The selected language is stored locally and restored on later
visits.

## 11. PWA behavior

SyncTime remains installable from a hosted URL on supported phones without App
Store or Play Store distribution. Preserve the manifest, icons, theme colors,
and minimal app-shell service worker. Local data persistence must continue to
work in both a normal browser tab and an installed PWA, subject to the device's
browser-storage lifecycle.

Do not add background synchronization or external data transmission.

## 12. Development demo

`npm run dev:demo` remains a development-only preview with a realistic employee,
an in-progress current period, and a finalized previous period. It is useful for
quick interface testing. Its in-memory sample changes reset on reload.

Demo mode must require both Vite development mode and the explicit `demo` mode;
it cannot be enabled by a production build. The normal application uses the
same timesheet interface with local browser persistence.

## 13. Accessibility and visual direction

- Touch-friendly controls and readable type on small phone screens.
- Visible labels; do not rely on placeholders alone.
- Keyboard-operable controls and clear focus states.
- Semantic headings, form labels, notices, and tables.
- Warm off-white surfaces, deep teal brand color, coral accent, restrained
  shadows, and generous spacing.
- Professional, plain print output.

## 14. Testing and acceptance

Automated tests should cover date generation, calculations, review filtering,
local name and timesheet persistence, multiple-period isolation, finalization
and re-finalization, translations, and demo safety. A production build must
succeed without a local environment file or backend credentials.

Before release, manually verify first use, returning use, name editing, saving
and reloading, period switching, finalization, correction, English/Spanish,
print layout, PWA behavior, and representative small-phone layouts.

## 15. Deployment boundary

Repository work does not authorize production deployment, DNS changes, external
service configuration, or changes to previously created backend resources. Git
history preserves the retired backend implementation. Any existing external
project may be paused or deleted later only through a separate, deliberate
operational decision.
