# Repository guidance for Codex

- Read `PROJECT_SPEC.md` before making product-level decisions.
- Keep SyncTime simple, functional, bilingual, mobile-first, and local-first.
- Do not add employee authentication, accounts, PINs, passwords, verification
  codes, backend persistence, or automatic timesheet delivery unless the
  product specification is explicitly changed again.
- Store the employee name, selected language, drafts, and local finalization
  state in straightforward browser-local persistence. Be explicit that clearing
  browser/app data may remove them.
- Treat `Finalize` as a local completion status only. It never means a manager
  received or approved a timesheet. Preserve the employee's separate Print /
  Save as PDF and manual-forwarding step.
- Do not add confidential payroll fields such as wages, pay rates, tax details,
  banking details, or government identifiers.
- The user is the application developer. Explain important architecture and
  implementation decisions clearly enough for them to maintain the project.
- Work incrementally. Implement only the requested feature or phase and directly
  necessary supporting changes; do not autonomously expand into deferred work.
- Inspect relevant files and `git status` before significant changes. Preserve
  unrelated user work and never discard it without explicit permission.
- Prefer conventional, readable TypeScript, focused components, pure utilities,
  and straightforward data flow. Avoid speculative abstractions and enterprise
  layers.
- Keep all user-facing text in the centralized English/Spanish translation
  system and maintain accessible, touch-friendly UI.
- Do not add third-party data transmission, credentials, or browser-exposed
  secrets. No environment variables are required for the local-first app.
- Do not create or change live external resources, production hosting, DNS,
  secrets, or deployments without explicit instruction.
- Do not push, force-push, rewrite Git history, change remotes, or reinitialize
  Git unless explicitly requested.
- Run tests, lint, type/build checks, and local UI checks appropriate to the
  work. Report important files, checks, limitations, and a concise suggested
  commit message.
