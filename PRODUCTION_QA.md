# MVP deployment QA

## Local checks (not production QA)

- `npm run typecheck`: passed before Render configuration was added.
- `npm test`: passed, 2 tests, before Render configuration was added.
- `render.yaml` build command will rerun both checks on Render.

## Production status

Smoke-tested on `https://ajaia-docs-mvp.onrender.com/` on 2026-11-24. Full production QA remains incomplete.

| Case | Status | Notes |
|---|---|---|
| Public URL loads and `/api/health` responds | Passed | Landing page loaded; health returned `{"ok":true,"mode":"demo"}` |
| Demo account switching | Passed | Signed in as Alex, then switched to Jamie |
| Create, rename, edit, formatting, save and refresh | Blocked | Must verify during active instance; file store is ephemeral |
| `.txt` and `.md` import | Blocked | Must test deployed API |
| Share viewer/editor roles and collaborator removal | Blocked | Must test deployed API |
| Revoked collaborator loses access | Blocked | Must test deployed API |
| Owner deletion and collaborator deletion denial | Blocked | Must test deployed API |
| Mobile layout and browser console | Blocked | Must inspect on public URL |
| Documents survive spin-down/restart/redeploy | Not tested; expected failure | Render Free ephemeral filesystem discards file changes |
| No secret exposure | Partially checked | `.env` and `data/store.json` were excluded from Git; full deployed bundle audit not performed |
