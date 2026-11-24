# Deployment Log

## 2026-11-24 — Initial inspection and deployment plan

- Read the project inventory, `package.json`, `.env.example`, `.gitignore`, server, client entry HTML, existing authorization tests, README, AI workflow, and deployment notes.
- Confirmed the project has no Git repository/remote and no Vercel, Supabase, or GitHub CLI. No provider deployment or login was attempted.
- Identified blockers: local JSON persistence, in-memory passwordless sessions, no deployment adapter/configuration, no hosted DB/Auth, and no provider credentials.
- Recorded configured global Git identity as `prazpc <cprazwal@gmail.com>` from `C:/Users/cpraz/.gitconfig`; it has not been confirmed by the user, so no commit was created.
- Prepared `DEPLOYMENT_PLAN.md`: proposed Vercel Hobby + Supabase Free, conditional on Vercel Hobby personal/non-commercial eligibility.
- Status: **not deployed**. No public URL, provider project, GitHub repository, or commit exists.

## 2026-11-24 — Local checks and deployment guide

- Replaced the generic deployment notes with a provider-specific preparation guide in `DEPLOYMENT.md`.
- Ran `npm test`: 2 tests passed, 0 failed. These cover the existing local server only; they do not verify a production adapter or hosted behavior.
- Ran `npm run typecheck`: passed for the existing `server.js` and `public/app.js`.
- Confirmed `git status` cannot run because this directory is not a Git repository; no commit was created.
- Deployment remains blocked: production serverless adapter, Supabase migration, production password authentication, and provider/repository setup are not implemented or configured. No provider login or secret entry was attempted.
