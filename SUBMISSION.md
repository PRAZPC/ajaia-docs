# Ajaia Docs — Assessment Submission

> **Release status — 24 November 2026:** The latest implementation is on the GitHub `main` branch. The Render URL is currently documented as running an earlier deployment, and the production QA report records only smoke checks—not a full end-to-end test of the latest feature set. The feature table below describes the latest source on `main`, not necessarily the currently deployed Render build. The latest source can be run locally using the instructions below.

## 1. Submission links

- **Live MVP:** [https://ajaia-docs-mvp.onrender.com/](https://ajaia-docs-mvp.onrender.com/)
- **Source code:** [PRAZPC/ajaia-docs](https://github.com/PRAZPC/ajaia-docs) — `main` branch
- **Walkthrough video:** [Watch Ajaia Docs](https://youtu.be/jEK09wregSU)
- **Google Drive handoff folder:** [Open the project handoff folder](https://drive.google.com/drive/u/0/folders/1USsrAAWRcyZ84rPYf9xjOjvAG6hQjwpq)
- **Screenshots folder:** [Open screenshots](https://drive.google.com/drive/u/0/folders/1W0d_LyfhipcKkO_5yf7RBJZQmNloCMhO)

**Packaging note:** The assessment asks for one Google Drive folder. Please ensure the screenshots folder is nested inside the handoff folder (or move its contents into a `screenshots/` subfolder there) and verify that the parent folder is accessible to reviewers with the link. The two links above were supplied separately; their folder relationship and sharing permissions have not been independently verified.

## 2. Reviewer quick start

### Run the latest source locally

**Prerequisite:** Node.js 20 or newer. The project has no third-party npm dependencies, so `npm install` is not required.

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000), then select one of the seeded demo accounts:

| Demo account | Email | Password |
|---|---|---|
| Alex Morgan | `alex@ajaia.demo` | No password |
| Jamie Lee | `jamie@ajaia.demo` | No password |
| Taylor Kim | `taylor@ajaia.demo` | No password |

These are public assessment demo identities, not production user accounts. Do not enter sensitive information.

### Suggested review flow

1. Sign in as **Alex** and create a document.
2. Rename it, type content, apply a heading, bold, italic and underline formatting, and wait for the **Saved** indicator.
3. Import the included `samples/import-example.md` file, or import a `.txt`/`.md` file of your own.
4. Open **Comments & suggestions**. Add a comment and submit a proposed text replacement.
5. Save a version, make another edit, then open **History** and restore the earlier version.
6. Share the document with **Jamie** as an editor and **Taylor** as a viewer. Select **Save changes**.
7. Switch accounts from the header. Confirm that Jamie can edit and Taylor can view but cannot edit.
8. Return as Alex, remove a collaborator, and save the sharing changes. Confirm that the revoked user can no longer open the document.
9. Return as Alex and delete a disposable test document. Deletion is owner-only and requires confirmation.

### Automated checks

Run:

```bash
npm test
npm run typecheck
```

`npm test` runs two Node.js test cases: an HTML sanitization test and an HTTP-level integration test covering document access, viewer restrictions, comments/suggestions, sharing changes and revocation, import validation, owner-only deletion, and persistence across a local server restart.

Despite its script name, `npm run typecheck` runs Node.js syntax checks for `server.js` and `public/app.js`; it is **not** a TypeScript type checker. The project does not currently include a browser end-to-end test suite or a lint/build pipeline.

## 3. Feature status — latest `main` branch

| Capability | Status in latest source | Scope and notes |
|---|---|---|
| Demo sign-in and account switching | Implemented | Three seeded, passwordless demo accounts; account switching is available from the header. This is not production authentication. |
| Create, rename, edit, autosave and reopen | Implemented | Document content and metadata are saved to the JSON store. |
| Rich-text editing | Implemented | Paragraphs, headings, bold, italic, underline, bulleted and numbered lists, quotes, and page breaks. Toolbar state reflects active and mixed formatting selections. |
| File import | Implemented | `.txt` and `.md` files up to 1 MB are imported as new editable documents. Markdown headings, lists and basic emphasis are converted to editor markup. |
| Export | Implemented | Markdown download and browser print / Save as PDF. |
| Sharing and permissions | Implemented | Owners can add collaborators, change viewer/editor roles, and revoke access. The server checks permissions for each protected operation. |
| Shared-document context | Implemented | Shared documents display the owner's name and the current viewer/editor role. |
| Comments | Implemented | Collaborators can post comments with an optional selected-text reference. |
| Suggestion mode | Implemented | Collaborators can suggest selected-text replacements; editors can accept or reject suggestions. |
| Version history | Implemented | Manual checkpoints and rate-limited edit snapshots; restoring a version first preserves the pre-restore state. A maximum of 20 versions is retained per document. |
| Pagination | Implemented with a constraint | Automatic and manual page breaks are supported at editor block boundaries. A single long paragraph or tall block is not split internally. |
| Document deletion | Implemented | Owner-only API and UI action with confirmation. |
| Automated checks | Passed locally | See [`QA_REPORT.md`](QA_REPORT.md). These results are local checks, not proof that every workflow passed on the hosted instance. |

## 4. Architecture and engineering decisions

The application uses a small, dependency-free Node.js HTTP server and a browser-native frontend.

- `server.js` serves the application, exposes the JSON API, validates requests, sanitizes editor HTML, enforces access rules, and persists data.
- `public/index.html`, `public/app.js`, and `public/styles.css` provide the responsive workspace and editor.
- `test/server.test.js` contains the automated server tests.
- `data/store.json` is created at runtime and is excluded from Git.

The editor uses a native `contenteditable` surface and stores an allowlisted subset of HTML. This avoided adding a large editor dependency within the assessment timebox. The trade-off is that browser-native editing is less structured than a dedicated editor framework and pagination is block-based.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DECISIONS.md`](DECISIONS.md) for the detailed design and trade-offs.

## 5. Deployment and persistence status

The public MVP is hosted on Render Free:

[https://ajaia-docs-mvp.onrender.com/](https://ajaia-docs-mvp.onrender.com/)

The repository's [`PRODUCTION_QA.md`](PRODUCTION_QA.md) records successful smoke checks for the landing page, health endpoint, Alex sign-in, and switching to Jamie. It does **not** record successful production tests for document editing, import, sharing/revocation, deletion, mobile behavior, or the full persistence lifecycle. Those checks remain outstanding for the latest source.

The current Render deployment uses the local JSON file store and does not have a hosted database or persistent disk. Render Free's filesystem is ephemeral; documents may be lost after the service spins down, restarts, or redeploys. Sessions are held in process memory and reset when the server restarts. This deployment is therefore a low-cost assessment MVP, not durable document hosting. Use only non-sensitive test content.

**Important release action:** Redeploy the latest `main` branch and rerun the production acceptance flow before presenting the public URL as the latest version. If the application must retain documents across service restarts or idle periods, migrate the JSON store to a persistent database such as managed PostgreSQL and verify that integration separately. Do not describe hosted persistence as durable until that work is complete.

See [`DEPLOYMENT.md`](DEPLOYMENT.md), [`DEPLOYMENT_LOG.md`](DEPLOYMENT_LOG.md), [`PRODUCTION_QA.md`](PRODUCTION_QA.md), and [`FINAL_DEPLOYMENT_REPORT.md`](FINAL_DEPLOYMENT_REPORT.md).

## 6. AI-native workflow

Codex was the primary AI coding assistant. ChatGPT was used to structure the assessment approach, prepare focused Codex instructions, and critically review the final implementation and submission materials. Local browser automation was used for interaction checks, and Node.js's built-in test runner was used for automated verification.

AI materially accelerated task decomposition, the initial server and frontend implementation, documentation, and iteration. Human review changed the implementation after browser checks exposed issues: the editor initially lacked the required `contenteditable` attribute, and viewer-side formatting controls were initially enabled even though the server correctly rejected viewer writes. These issues were corrected and rechecked.

The implementation deliberately deferred a larger framework/database migration, real-time collaboration, and DOCX support during the short build window in favor of a dependency-free, locally runnable MVP. That trade-off made delivery faster but leaves hosted persistence and production-grade authentication as known gaps.

See [`AI_WORKFLOW.md`](AI_WORKFLOW.md).

## 7. Included submission materials

- Source code: [GitHub repository](https://github.com/PRAZPC/ajaia-docs)
- Setup and reviewer instructions: [`README.md`](README.md)
- Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Product and implementation decisions: [`DECISIONS.md`](DECISIONS.md)
- AI workflow: [`AI_WORKFLOW.md`](AI_WORKFLOW.md)
- Local QA evidence: [`QA_REPORT.md`](QA_REPORT.md)
- Production QA status: [`PRODUCTION_QA.md`](PRODUCTION_QA.md)
- Deployment guide and limitations: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- Deployment history: [`DEPLOYMENT_LOG.md`](DEPLOYMENT_LOG.md)
- Walkthrough script: [`WALKTHROUGH_SCRIPT.md`](WALKTHROUGH_SCRIPT.md)
- Walkthrough video: [YouTube](https://youtu.be/jEK09wregSU)
- Submission handoff: [Google Drive folder](https://drive.google.com/drive/u/0/folders/1USsrAAWRcyZ84rPYf9xjOjvAG6hQjwpq)
- Screenshots: [Google Drive folder](https://drive.google.com/drive/u/0/folders/1W0d_LyfhipcKkO_5yf7RBJZQmNloCMhO)

## 8. Known limitations and next steps

1. **Align the deployment with the source:** deploy the latest `main` commit and test the latest UI and API workflows on the public URL.
2. **Make hosted storage durable:** replace the ephemeral JSON file on Render Free with a persistent database/storage solution, or retain the current MVP limitation and state it prominently.
3. **Upgrade identity for real use:** replace the passwordless demo account selector with real authentication before using the app for non-demo users or sensitive documents.
4. **Expand automated verification:** add browser end-to-end coverage for formatting, autosave, account switching, sharing/revocation, pagination, and deletion.
5. **Improve editor edge cases:** split long paragraphs across pages if true print-page pagination is required; consider DOCX import only if time and scope allow.

The current build prioritizes a complete, explainable core workflow over real-time collaboration, enterprise authentication, DOCX support, and production-scale storage.
