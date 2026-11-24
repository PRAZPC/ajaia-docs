# AI Workflow — Ajaia Docs Assessment

## Tools used

- **Codex (desktop workspace):** Primary AI coding assistant. Used to inspect the repository, break down the assessment, implement the Node.js server and browser UI, write tests, update documentation, and iterate on defects.
- **ChatGPT:** Used to structure the assessment approach, prepare detailed task-specific instructions for Codex, and critically review the product, deployment notes, and submission materials. ChatGPT was used for planning and review rather than being represented as the author of the Git commits.
- **Codex browser-control / local browser automation:** Used to exercise sign-in, document creation and editing, formatting, sharing, account switching, and reopening saved content.
- **Node.js built-in test runner:** Used to run the project's automated HTTP and sanitization tests.

## Where AI materially accelerated the work

- Converted the open-ended assessment into a prioritized delivery plan: core document editing, file import, sharing and authorization, persistence, QA, deployment, and submission documentation.
- Generated the initial server, browser interface, JSON persistence layer, import conversion, permission checks, automated tests, and supporting documentation.
- Helped reason through deployment options and the practical consequences of using a free hosting tier with an ephemeral filesystem.
- Helped create focused Codex instructions for fixing user-observed UI issues and for reviewing the final release.

## Human review, changes, and rejected output

AI-generated output was not accepted without testing.

- The first editor markup omitted `contenteditable="true"`. Browser interaction failed to enter text; the markup was corrected and the same interaction then successfully typed and autosaved content.
- The first browser pass showed that viewer formatting controls were enabled even though the server denied viewer write requests. The UI was changed to disable editing controls for viewers; the server remains the security boundary.
- A larger framework/database migration, real-time co-editing, and DOCX import were deferred rather than added late in the timebox. The decision favored a smaller working core and explicit limitations over partially implemented infrastructure or stretch features.
- The Render Free deployment was kept as a $0 MVP rather than described as durable storage. Its ephemeral filesystem and the passwordless demo identities are disclosed as limitations.

## Verification

- `npm test` passed the two Node.js test cases. They cover HTML allowlist/page-break sanitization and an HTTP workflow including document permissions, viewer write denial, comments/suggestions, share updates/revocation, import validation, owner-only deletion, and local persistence across a server restart.
- `npm run typecheck` passed. This script runs Node syntax checks for `server.js` and `public/app.js`; it is not a TypeScript type checker.
- Local browser checks covered account switching, document editing, formatting state, sharing changes and discard behavior, revocation, page breaks, sidebar behavior, logout, and deletion confirmation.
- The hosted Render deployment received smoke checks for the landing page, health endpoint, demo sign-in, and account switching. Full production end-to-end QA of the latest source remains incomplete because the latest `main` source has not yet been redeployed and tested.

## Trade-offs and limitations

The project uses a dependency-free Node.js HTTP server, browser-native `contenteditable`, and a local JSON document store. This reduced setup time and made the app immediately runnable, but it is not a production-scale architecture: the JSON store is single-process, does not provide multi-instance concurrency or backups, and the Render Free filesystem is ephemeral. Demo accounts are passwordless and publicly selectable.

These choices are documented rather than presented as production-ready capabilities.
