# Ajaia Docs — Deployment Plan

## Findings

- The app is a plain Node.js `http` server with a vanilla HTML/CSS/JavaScript client and no runtime dependencies.
- `npm start` launches `server.js`; `PORT` is already read from the host environment.
- Documents are stored in the JSON file at `DATA_FILE` (default `data/store.json`). The file is ignored by Git.
- Demo accounts are hard-coded and selected without passwords. Session tokens live in memory and are lost at restart.
- The API supports login/logout, document CRUD, import of `.txt`/`.md`, and sharing/viewer/editor permissions. Existing server-side authorization remains in place.
- The long-running Node server is suitable for a small Render web service. It is not suitable as-is for stateless Vercel Functions.
- The user confirmed the personal Git identity `prazpc <cprazwal@gmail.com>` and requested a GitHub push. The directory has no Git repository or remote yet.

## MVP deployment decision

Deploy the app unchanged as a **single Render Free Node web service**. This keeps the existing demo accounts and JSON-store workflow, adds no account system/database, and uses the smallest architecture that can run the current server. `render.yaml` declares a free service, runs syntax/tests at build time, starts `npm start`, and checks `/api/health`.

The public account picker is a demo switcher, not secure authentication. Anyone with the URL can select Alex, Jamie, or Taylor. Use only for non-sensitive MVP testing.

## Known free-tier limits

Render Free services sleep after 15 minutes without traffic and take about a minute to wake. Their filesystem is ephemeral: local document changes are lost on spin-down, restart, or redeploy. The service may restart at any time. Consequently, the MVP is appropriate for short-lived testing, not durable document storage. The deployment starts with an empty document list; the ignored local `data/store.json` will not be published.

No paid service, database, object storage, domain, or new authentication system is configured. A later requirement for durable data would need a separate persistence decision.

## Deployment steps

1. Run `npm run typecheck` and `npm test`.
2. Initialize Git, configure the confirmed personal identity locally, inspect staged files, and create a meaningful commit. Keep `.env` and `data/store.json` excluded.
3. Push the repository to the user's GitHub account.
4. In Render, create a Blueprint from that GitHub repository and select the Free web service defined in `render.yaml`. Do not select a paid plan or create additional resources.
5. Wait for the build and health check, then test the public URL, demo account switching, document creation/editing, import, sharing, and the known ephemeral-data behavior.
6. Record the real URL and outcomes in `DEPLOYMENT_LOG.md`, `PRODUCTION_QA.md`, and `FINAL_DEPLOYMENT_REPORT.md`.

## Current blockers

- The code is pushed to `https://github.com/PRAZPC/ajaia-docs.git` on `main` using the confirmed personal identity.
- Render Free Blueprint `ajaia-docs-mvp` is live at `https://ajaia-docs-mvp.onrender.com/`.
- Full workflow QA remains pending; see `PRODUCTION_QA.md`. The ephemeral document-loss limitation is part of the accepted MVP tradeoff.
