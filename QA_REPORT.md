# Ajaia Docs Fixes — QA Report

Date: 2026-11-24 (Asia/Katmandu)

## Automated checks

| Check | Result | Coverage |
|---|---|---|
| `npm test` | Pass: 2 tests | HTML allowlist and canonical page-break sanitization; API permissions; staged role updates; revoke; owner-only delete; import validation; restart persistence; share visibility after restart. |
| `npm run typecheck` | Pass | Node syntax checks for `server.js` and `public/app.js` (not a TypeScript check). |

## Browser checks

- Signed in as Alex, then switched to Jamie and back from the header account menu. Jamie saw only her own documents and documents shared with her; shared rows named the owner and role.
- Collapsed/reopened the sidebar from the header control.
- Created and retained a QA document (`Ajaia Fixes QA`), entered text, inserted an explicit page break, and confirmed the page count changed to two.
- Selected text and applied Bold; the toolbar reported pressed state.
- Staged a share addition and confirmed Save changes became available. Cancel raised a discard confirmation; the draft was discarded without changing server shares.
- Opened the delete confirmation for the QA document and dismissed it; the document remained saved.
- Verified the X beside the brand returns from the open editor to the document list and keeps the workspace expanded.
- Typed 44 lines using Enter in a disposable document; the editor inserted a page break after line 37 and updated the page count automatically.
- Used the bottom Log out button; it returned to the demo sign-in screen. Signed back in as Alex after verification.
- Checked the collapsed sidebar at the narrow in-app viewport; the main area uses the available width.
- Verified the toolbar now visibly says “Import .txt / .md”, the dashboard displays a small upload link below Create your first document, and Log out is visible at the top right.
- Replaced the filled page-break band with a light divider and next-page label; the remove control appears on hover or keyboard focus.
- At a collapsed caret, clicked Bold and then Italic; both toolbar buttons immediately showed pressed/active state before any text was typed.
- Removed the bright focus rectangle around the full editor; focus is now indicated by a subtle paper-edge accent.

## Not manually exercised in browser

- Successful share-save, live revoke while another user tab is open, retry after a failed request, small-screen drawer interaction, and successful deletion were covered by code-path review or server tests, not by a destructive browser scenario. The test suite verifies the server's access denial and deletion behavior. Existing documents and shares were deliberately not modified for browser QA.

## Known limits

- Pages use automatic breaks at editor block boundaries, with optional manual early breaks. Long paragraphs or a single very tall block are not split internally.
- Auth is passwordless demo login and session state is held in process memory.
- JSON storage is single-process demo persistence. There is no hosted deployment or cross-browser certification in this workspace.
