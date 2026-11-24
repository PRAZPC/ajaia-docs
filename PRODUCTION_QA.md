# MVP deployment QA

## Local checks (not production QA)

- `npm run typecheck`: passed before Render configuration was added.
- `npm test`: passed, 2 tests, before Render configuration was added.
- `render.yaml` build command will rerun both checks on Render.

## Production status

Not run. There is no GitHub remote, Render service, or public URL yet. Do not mark these cases passed until checked on the real URL.

| Case | Status | Notes |
|---|---|---|
| Public URL loads and `/api/health` responds | Blocked | No Render service yet |
| Demo account switching | Blocked | Must test Alex/Jamie/Taylor on deployed URL |
| Create, rename, edit, formatting, save and refresh | Blocked | Must verify during active instance; file store is ephemeral |
| `.txt` and `.md` import | Blocked | Must test deployed API |
| Share viewer/editor roles and collaborator removal | Blocked | Must test deployed API |
| Revoked collaborator loses access | Blocked | Must test deployed API |
| Owner deletion and collaborator deletion denial | Blocked | Must test deployed API |
| Mobile layout and browser console | Blocked | Must inspect on public URL |
| Documents survive spin-down/restart/redeploy | Expected failure | Render Free ephemeral filesystem discards file changes |
| No secret exposure | Blocked | Verify deployed assets and environment; no production secrets are configured |
