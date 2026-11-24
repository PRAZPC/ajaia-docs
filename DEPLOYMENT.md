# MVP deployment guide

## Architecture

One Render Free Node.js web service runs the existing `server.js` and serves the static frontend from `public/`. `render.yaml` specifies the build checks, `npm start`, and `/api/health` health check. There is no database or separate file-storage service.

## Important MVP behavior

The current demo account selector remains as-is. It is not secure authentication; anyone with the public URL can choose a demo account. Use non-sensitive test content only.

The JSON document store is local to the service. Render Free has an ephemeral filesystem and spins down after 15 minutes idle. Documents are lost on spin-down, restart, and redeploy; cold start can take about one minute. This is a $0 MVP testing deployment, not durable document hosting.

The deployment begins with an empty document list. Do not add `data/store.json` to Git: it is local user data and is ignored by `.gitignore`.

## GitHub setup

The project is pushed to [PRAZPC/ajaia-docs](https://github.com/PRAZPC/ajaia-docs) on `main`. The confirmed identity `prazpc <cprazwal@gmail.com>` is recorded as the author and committer. `.env` and `data/store.json` remain excluded by `.gitignore`.

## Render setup

1. Sign in to Render and choose **New → Blueprint**.
2. Connect the GitHub repository containing this project.
3. Render reads `render.yaml`. Confirm the plan is **Free** and creates only the one web service `ajaia-docs-mvp`.
4. Do not add a paid disk, database, add-on, custom domain, or paid plan.
5. Deploy and wait for `/api/health` to pass. The health response is `{ "ok": true, "mode": "demo" }` and contains no secrets.
6. Open the generated `onrender.com` URL and run the MVP checks in `PRODUCTION_QA.md`.

The current Blueprint is live at [https://ajaia-docs-mvp.onrender.com/](https://ajaia-docs-mvp.onrender.com/). No provider credentials belong in source code.

## Local use

Run `npm start` (default `http://localhost:3000`) or `npm run dev`. `DATA_FILE` can select a different local JSON store. `.env.example` documents the local-only environment values; this deployment requires no secrets or production environment variables.
