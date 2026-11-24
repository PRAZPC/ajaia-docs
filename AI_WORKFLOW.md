# AI workflow

## Tools used

- Codex in the desktop workspace: read and decompose the supplied assessment prompt, inspect the project, implement the app and documentation, and run checks.
- Local browser automation through the Codex browser-control tool: manually exercised sign-in, document creation/editing, heading formatting, sharing, account switching, and reopening saved content.
- Node.js built-in test runner: executed the access-control test.

The exact model identifier was not available in the session UI, so it is not guessed here.

## Where AI materially helped

- Turned the assessment scorecard into a prioritized implementation plan. The initial workspace inspection showed no existing stack to extend.
- Generated the initial server, browser UI, persistence, import, access-control test, and reviewer documentation, then iterated on issues found during checks.

## Human review and iteration

- The initial editor markup omitted `contenteditable="true"`. A browser interaction failed to enter text, so the markup was corrected and the same interaction then successfully typed and autosaved content. This is direct evidence of review changing the implementation.
- The first browser pass also showed that viewer formatting controls were still enabled even though server updates were denied. The UI was updated to disable editing controls for viewer access; server enforcement remains the security boundary and is covered by the automated test.
- A local implementation was selected over the prompt's suggested Next.js/PostgreSQL stack because the workspace was empty and an install/build/deploy pipeline was not present. This saves setup time but intentionally leaves hosted persistence and production identity as incomplete.

## Verification and limits

`npm test` passed both the HTML allowlist test and HTTP access-control/import/persistence scenario, including a server restart with the same data file. `npm run typecheck` passed Node syntax checks for the server and client script; it is not a static type checker. Browser checks confirmed title/content autosave, heading, bold, italic, underline, bulleted and numbered list formatting, Markdown file import, sharing with Jamie as editor, viewer-mode controls with Taylor, recipient visibility, and formatting persistence after reloading and reopening. Quote formatting, responsive layouts, lint, and a hosted production smoke test remain unverified. No deployment or video upload is claimed.

Human judgment is still required for production authentication, database/hosting selection, review of browser-native editing behavior across browsers, and recording/submitting the walkthrough.
