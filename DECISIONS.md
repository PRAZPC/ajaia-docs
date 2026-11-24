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
- Trade-off: Demo authentication is not production identity management.
- Verification / evidence: Browser check switched from Alex to Jamie. `npm test` confirmed private reads return 404, a shared viewer can read, viewer writes return 403, and only the owner can manage shares.

## Import and deployment scope
- Context: Import and a live deployment are required, but no provider account or credentials were supplied.
- Decision: Accept `.txt` and `.md` up to 1 MB, validate on the server, convert to allowlisted editor HTML, and create a new document. Mark deployment as not completed until real hosting and durable database infrastructure are available.
- Alternatives considered: DOCX support immediately; claiming a live deployment without provider access.
- Why this option: Plain text/Markdown provides a real, bounded import path without external dependencies; deployment must be verified against actual infrastructure.
- Trade-off: Import scope may be narrower than DOCX; live deployment may remain blocked.
- Verification / evidence: Browser file selection successfully imported `samples/import-example.md`, rendering a heading, list, and emphasis. Automated tests reject unsupported extensions and incompatible MIME types. Workspace inspection found no deployment configuration or provider credentials.

## Assessment fixes: editor, navigation, sharing, and deletion
- Context: The assessment requested reviewable fixes for formatting state, reliable account/sidebar controls, staged share permissions and revocation, shared-owner metadata, deletion authorization, and pages.
- Decision: Keep the existing dependency-free app and local JSON model. Add one owner-only atomic share-update request, keep the current single contenteditable editor, and represent pages with sanitized breaks inserted at block boundaries as the page height fills; users can still insert an early break. Add a header account menu, sidebar collapse/reopen controls, active toolbar state, and owner metadata in shared rows. The X in an open document returns to the document list, and Log out is available at the sidebar bottom.
- Alternatives considered: Replace the editor and data store; split pages into separate editable surfaces; mutate collaborator roles immediately on each dropdown change.
- Why this option: It completes the requested workflows without a migration or risk to the existing demo data. Block-boundary page breaks support Enter-created paragraphs without splitting editor state. A batch share update ensures the current access list changes only after Save changes.
- Trade-off: A single long paragraph or tall block is not split internally. Demo auth and JSON persistence remain local, single-process choices.
- Verification / evidence: `npm test` covers allowlist sanitization, role changes, revocation, owner-only deletion, import validation, and persistence across server restart. Manual browser checks covered active toolbar state, automatic page break after 37 of 44 Enter-created lines, X returning to dashboard, logout, account switch, sidebar toggle, share staging/discard confirmation, and delete confirmation. Existing documents and share records were left intact; only QA documents were created.
