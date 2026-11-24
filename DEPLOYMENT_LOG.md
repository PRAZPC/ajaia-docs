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

## 2026-11-24 — MVP Render deployment

- Followed the user's updated MVP scope: retain existing demo account picker and JSON-file persistence; no new auth service or database.
- Added Render Free Blueprint configuration (`render.yaml`) and `GET /api/health`.
- `npm test`: passed (2 tests). `npm run typecheck`: passed.
- Initialized Git with repository-local identity `prazpc <cprazwal@gmail.com>`, added remote `https://github.com/PRAZPC/ajaia-docs.git`, and pushed branch `main`.
- Commit `6deace82b6b27610ba9e23520adbd5dcf5e2e18d` — `feat: prepare Ajaia Docs MVP deployment`. Verified both author and committer match the confirmed personal identity.
- Confirmed `.env` and `data/store.json` were ignored and absent from the staged set.
- Created Render Blueprint `ajaia-docs-mvp` in the `adv-ai` workspace, using one Free Node web service with no database, disk, or paid add-on. Render marked the commit Live.
- Public URL: `https://ajaia-docs-mvp.onrender.com/`.
- Live verification: landing/login UI loaded; `/api/health` returned `{"ok":true,"mode":"demo"}`; Alex sign-in succeeded; switching to Jamie succeeded. No documents were created, so the deployed workspace remains empty.
- Limitation: Render Free filesystem is ephemeral. Documents can be lost after idle spin-down, restart, or redeploy. Production QA beyond the above smoke checks remains pending.
