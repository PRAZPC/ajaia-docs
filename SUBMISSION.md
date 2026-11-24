# Submission

## Application

- Live URL: **NOT DEPLOYED**. Local demo: `http://localhost:3000` after `npm start`.
- Source code: current project folder.
- Demo accounts: `alex@ajaia.demo`, `jamie@ajaia.demo`, `taylor@ajaia.demo`; passwordless local demo sign-in.
- Google Drive destination: not provided or connected; upload/package handoff remains a manual step.

## Required materials

- [x] Source code
- [x] `README.md`
- [x] `ARCHITECTURE.md`
- [x] `AI_WORKFLOW.md`
- [x] `SUBMISSION.md`
- [x] `ASSESSMENT_PROGRESS.md`
- [x] `DECISIONS.md`
- [x] `WALKTHROUGH_SCRIPT.md`
- [x] `WALKTHROUGH_VIDEO_URL.txt` (explicitly pending)
- [x] `.env.example`
- [ ] Walkthrough video URL — recording and upload are pending
- [ ] Screenshots — not captured
- [x] `DEPLOYMENT.md` — deployment blocker and steps documented
- [x] `ASSESSMENT_REVIEW.md` — self-review scores and evidence

## Feature status

| Feature | Status | Evidence / how to review |
|---|---|---|
| Demo sign-in and account switching | Implemented; header switch tested Alex → Jamie → Alex | Choose seeded email or use the header account menu |
| Create, rename, edit, reopen and persistence | Implemented; basic content/heading flow manually checked | Create as Alex; wait for Saved; reload and reopen |
| Rich text | Toolbar selection state and Bold pressed-state verified; existing formatting behavior remains | Select text, use toolbar, and inspect `aria-pressed` state |
| Text/Markdown import | Toolbar now has a labeled “Import .txt / .md” control; dashboard also has a small upload link | Import supports `.txt` and `.md` up to 1 MB and creates a new editable document |
| Sharing | Staged changes and discard confirmation manually checked; role update/revoke authorized by server tests | Stage a change in Share, then Save changes |
| Shared-by metadata, sidebar, and page break count | Manually checked | Shared rows identify owner/role; toolbar page count follows manual breaks |
| X to dashboard, automatic page flow, and logout | Manually checked after follow-up fixes | X from an open doc returns to the document dashboard; Enter adds page breaks at page height; Log out returns to sign-in |
| Server authorization, share updates/revocation, deletion, HTML allowlist, import validation, and restart persistence | Verified by automated tests | `npm test`; see `QA_REPORT.md` |
| Hosted deployment | Not deployed | Hosting account/database not supplied |
| Walkthrough video | Pending | See `WALKTHROUGH_VIDEO_URL.txt` |

## Known limitations

- Authentication is passwordless and intended only for a local assessment demo.
- JSON storage and in-memory sessions are single-process demo choices, not production multi-user infrastructure.
- No live URL, persistent hosted database, screenshots, or video upload is available in this environment.
- The requested Google Drive folder destination was not included in the workspace or connected services.
- Import supports `.txt` and `.md` only. Browser-native contenteditable editing has not been checked across browsers.
- Pagination inserts breaks automatically at editor block boundaries and also allows manual early breaks. A single long paragraph is not split internally.
- A local QA document (`Ajaia Fixes QA`) was created during verification and retained. Existing documents and share records were preserved.

## Next 2–4 hours of work

1. Configure real authentication and a hosted transactional database, then deploy and verify the full reviewer journey.
2. Exercise successful share-save, stale-tab revocation, deletion, and mobile layout in the target browser; run cross-browser checks if a target matrix is provided.
3. Record and upload the 3–5 minute walkthrough, then update the real URL and status here.

## Self-review

See [ASSESSMENT_REVIEW.md](ASSESSMENT_REVIEW.md) for scores, evidence, strongest area, main gap, and the two-minute reviewer path.
