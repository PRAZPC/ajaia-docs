# Final Deployment Report

## Current status: Deployed — MVP smoke checks passed

- **Public URL:** [https://ajaia-docs-mvp.onrender.com/](https://ajaia-docs-mvp.onrender.com/)
- **Target architecture:** One Render Free Node web service using the existing demo accounts and JSON document store.
- **Provider cost:** $0 planned. No billing, paid add-on, domain, persistent disk, or database configured.
- **MVP behavior:** Demo login is passwordless and publicly selectable. Only non-sensitive test content should be used.
- **Storage:** `data/store.json` is stored on the Render service's ephemeral filesystem. Documents will be lost when a Free service sleeps, restarts, or redeploys.
- **Local verification:** `npm test` passed (2 tests) and `npm run typecheck` passed. Render's build command repeats both.
- **Production QA:** Landing page, health endpoint, Alex sign-in, and switch to Jamie passed. Full QA remains incomplete; see `PRODUCTION_QA.md`.
- **GitHub:** [PRAZPC/ajaia-docs](https://github.com/PRAZPC/ajaia-docs), branch `main`.
- **Git identity:** User-confirmed identity verified as both author and committer.
- **Commit:** `6deace82b6b27610ba9e23520adbd5dcf5e2e18d` — `feat: prepare Ajaia Docs MVP deployment`.

## Remaining steps

1. Test document create/edit/import/share workflows on the public URL if you want deeper MVP QA.
2. Remember that documents may disappear after Render Free idles, restarts, or redeploys.

The service is live and the recorded smoke checks were verified against the public URL.
