# Decisions

## Initial stack and project direction
- Context: The supplied assessment requires a full-stack collaborative document editor. The workspace contains prompt files only and no existing application or Git repository.
- Decision: Begin with the smallest stack already supported by the environment: Node.js built-in HTTP server and browser-native frontend, avoiding dependencies until package/network availability is clear.
- Alternatives considered: Next.js/TypeScript with hosted PostgreSQL; installing a conventional full-stack framework; local-only static app.
- Why this option: It is immediately runnable without package installation and can demonstrate server-side access checks and local persistence in an empty workspace.
- Trade-off: Less feature-rich editor and no hosted database/deployment by default; a local JSON store is suitable only for a demo and must be documented.
- Verification / evidence: Workspace inspection found no package files or existing code; Node.js v26.13.1 and npm 11.20.0 are available.

## Data model and editor storage
- Context: Documents must preserve formatted content and ownership/sharing across reloads.
- Decision: Store document records with owner ID, title, allowlisted HTML content, timestamps, and explicit `{ userId, role }` collaborator records in a local JSON file.
- Alternatives considered: Raw HTML, plain text, or structured JSON.
- Why this option: Native browser formatting creates a compact serialized representation without a package install; a server-side tag/attribute allowlist bounds what is stored.
- Trade-off: HTML is less structured than TipTap/ProseMirror JSON and browser-native editing varies across browsers.
- Verification / evidence: Local browser check confirmed a formatted heading remains after refresh and reopening. JSON is written to `data/store.json`, ignored by Git.

## Authentication and authorization
- Context: Reviewers need demo account switching and access must be enforced on the server.
- Decision: Provide three seeded passwordless demo identities with a random `HttpOnly; SameSite=Strict` session cookie. Keep sessions in process memory and clearly label the method demo-only.
- Alternatives considered: Client-side account selector only; external auth provider.
- Why this option: No provider credentials are present; server sessions and seeded accounts can support a local demo.
- Trade-off: Demo authentication is not production identity management and must be replaced before the app is used by real users or for sensitive documents.
- Verification / evidence: Browser check switched from Alex to Jamie. `npm test` confirmed private reads return 404, a shared viewer can read, viewer writes return 403, and only the owner can manage shares.

## Import and deployment scope
- Context: At the initial implementation stage, no provider account or credentials were supplied.
- Decision: Accept `.txt` and `.md` up to 1 MB, validate on the server, convert to allowlisted editor HTML, and create a new document. At that stage, deployment was to be described as incomplete until hosting was configured and verified.
- Alternatives considered: DOCX support immediately; claiming a live deployment without provider access.
- Why this option: Plain text/Markdown provides a real, bounded import path without external dependencies; deployment must be verified against actual infrastructure.
- Trade-off: Import scope is narrower than DOCX; the eventual Render Free deployment has ephemeral storage and does not provide durable hosted persistence.
- Verification / evidence: Browser file selection successfully imported `samples/import-example.md`, rendering a heading, list, and emphasis. Automated tests reject unsupported extensions and incompatible MIME types. A later release configured Render Free; see `DEPLOYMENT_LOG.md` for the deployment history.

## Assessment fixes: editor, navigation, sharing, and deletion
- Context: The assessment requested reviewable fixes for formatting state, reliable account/sidebar controls, staged share permissions and revocation, shared-owner metadata, deletion authorization, and pages.
- Decision: Keep the existing dependency-free app and local JSON model. Add one owner-only atomic share-update request, keep the current single contenteditable editor, and represent pages with sanitized breaks inserted at block boundaries as the page height fills; users can still insert an early break. Add a header account menu, sidebar collapse/reopen controls, active toolbar state, and owner metadata in shared rows. The X in an open document returns to the document list, and Log out is available at the sidebar bottom.
- Alternatives considered: Replace the editor and data store; split pages into separate editable surfaces; mutate collaborator roles immediately on each dropdown change.
- Why this option: It completes the requested workflows without a migration or risk to the existing demo data. Block-boundary page breaks support Enter-created paragraphs without splitting editor state. A batch share update ensures the current access list changes only after Save changes.
- Trade-off: A single long paragraph or tall block is not split internally. Demo auth and JSON persistence remain single-process choices; on Render Free, filesystem changes are ephemeral.
- Verification / evidence: `npm test` covers allowlist sanitization, role changes, revocation, owner-only deletion, import validation, and persistence across server restart. Manual browser checks covered active toolbar state, automatic page break after 37 of 44 Enter-created lines, X returning to dashboard, logout, account switch, sidebar toggle, share staging/discard confirmation, and delete confirmation. Existing documents and share records were left intact; only QA documents were created.

## Later assessment-release additions
- Context: Follow-up review requests expanded the local MVP after the initial assessment fixes.
- Decision: Add Markdown/PDF export, comments, selected-text suggestions, version history, improved `.txt` paragraph import, and history restore. Keep the existing JSON store and cap each document at 20 versions rather than introducing new infrastructure.
- Verification / evidence: The current source and tests cover comment/suggestion access rules, version creation/restore, and text import. See `SUBMISSION.md`, `QA_REPORT.md`, and `PRODUCTION_QA.md` for local versus hosted verification status.
- Trade-off: These features persist in the existing JSON record, so Render Free's ephemeral filesystem limitation continues to apply.
