# Ajaia Docs

A small collaborative writing workspace built for the Ajaia full-stack assessment. It supports demo-account sign-in, owned and shared documents, rich text, autosave, Markdown/text import, and owner-controlled sharing.

## Feature status

| Feature | Status |
|---|---|
| Demo sign-in and account switching | Complete for local demo; switcher stays in the header |
| Create, rename, edit, reopen and autosave documents | Complete; persisted to local JSON |
| Bold, italic, underline, headings, lists and quotes | Implemented; toolbar reflects active and mixed selection state |
| Import `.txt` and `.md` up to 1 MB | Complete locally; Markdown sample file chooser flow manually checked |
| Share with seeded users as viewer or editor | Stage role/add/remove changes, then save once; server checks each operation |
| Revoke and stale shared access | Complete; server denies revoked access and open shared views revalidate periodically |
| Delete documents | Owner-only API and UI action with confirmation; collaborators lose access |
| Shared document metadata | Lists the owner and the viewer/editor role |
| Pagination | Automatically inserts page breaks when content reaches the page height; manual early breaks are also available |
| Automated server checks | Share updates/revocation, deletion, authorization, sanitization and restart persistence; `npm test` |
| Hosted deployment and walkthrough video | Pending; see [SUBMISSION.md](SUBMISSION.md) and [DEPLOYMENT.md](DEPLOYMENT.md) |

## Run locally

Prerequisite: Node.js 20 or newer. There are no third-party npm dependencies.

```powershell
npm start
```

Open `http://localhost:3000`. Choose any demo account:

- Alex Morgan — `alex@ajaia.demo`
- Jamie Lee — `jamie@ajaia.demo`
- Taylor Kim — `taylor@ajaia.demo`

Demo sign-in has no password and is not suitable for production. The app stores documents in `data/store.json` on first write. Set `DATA_FILE` to use another path. `PORT` defaults to `3000`.

## Checks

```powershell
npm test
npm run typecheck
```

`npm run typecheck` runs Node's syntax checks; it is not a TypeScript type checker. The HTTP test also restarts the API server and checks that saved document content remains. No lint or production-build script is configured because this project has no bundler or external dependencies.

## Import behavior

Use the clearly labeled **Import .txt / .md** control in an editable document, or the small **Upload a document** link below the create-first-document button on the dashboard. Supported formats are `.txt` and `.md`, up to 1 MB. Import creates a new document. The server checks the extension and, when the browser supplies it, validates the MIME type. Markdown headings, lists, bold, italic, and underline syntax are converted to supported editor markup. Text files become paragraphs. Try the included `samples/import-example.md`. DOCX, images, embedded media, and Markdown tables are not supported. Malformed or oversized requests are rejected with an error message.

## Architecture and security notes

The Node HTTP server serves the browser app and implements JSON API routes. Document records contain an owner ID, HTML restricted to an allowlist of formatting tags, and explicit viewer/editor shares. API handlers check the session and document permissions before returning or changing a document. Viewer edits and non-owner sharing requests are denied server-side. See [ARCHITECTURE.md](ARCHITECTURE.md) for the data model and limitations.

This is an assessment demo, not production-ready authentication or hosting. Demo sessions are held in process memory and expire when the server restarts. JSON file persistence suits one local process; it does not provide multi-instance concurrency, backups, or durable hosted storage.

## Reviewer quick path

1. Run `npm start` and open `http://localhost:3000`.
2. Sign in as Alex, create a document, type text, apply formatting, and insert a manual page break.
3. Open Share, stage access or role changes, and choose Save changes. The account menu stays in the header.
4. Run `npm test` to verify access control, staged share updates, revocation, deletion and persistence.

The share dialog asks before discarding pending changes and confirms removals. Deleting a document is available only to its owner and requires confirmation. The sidebar can collapse and reopen from the header. Automatic pagination inserts a break when a new editor block reaches the page height; use Page break to begin a page early.

See [WALKTHROUGH_SCRIPT.md](WALKTHROUGH_SCRIPT.md) for the 3–5 minute demo sequence.
