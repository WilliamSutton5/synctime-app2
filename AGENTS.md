# Repository guidance for Codex

- Read `PROJECT_SPEC.md` before making product-level decisions.
- Keep SyncTime simple, functional, secure, bilingual, and mobile-first.
- Keep employee authentication low-friction: SMS verifies identity during
  registration, recovery, or necessary new-device setup; a protected 4-digit
  PIN is the normal returning flow. Do not add authentication barriers or store
  PINs in plaintext, and explain the Supabase session/PIN design before
  implementing it.
- The user is the application developer. Explain important architecture and
  implementation decisions clearly enough for them to maintain the project.
- Work incrementally. Implement only the requested feature or phase and directly
  necessary supporting changes; do not autonomously expand into later or
  deferred features.
- Inspect relevant files and `git status` before significant changes. Preserve
  unrelated user work and never discard it without explicit permission.
- Prefer conventional, readable TypeScript, focused components, pure utilities,
  and straightforward data flow. Avoid speculative abstractions and enterprise
  layers.
- Keep all user-facing text in the centralized English/Spanish translation
  system and maintain accessible, touch-friendly UI.
- Never hardcode credentials or expose a Supabase service-role key. Use ignored
  local environment files and a placeholder-only `.env.example`.
- Do not create or change live Supabase resources, production hosting, DNS,
  secrets, or deployments without explicit instruction.
- Do not push, force-push, rewrite Git history, change remotes, or reinitialize
  Git unless explicitly requested.
- Run tests, lint, and builds appropriate to the work. Report important files,
  checks, manual setup, and a concise suggested commit message.
