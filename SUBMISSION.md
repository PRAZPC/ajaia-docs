# Ajaia Docs — Assessment Submission

## Submission links

- **Demo video:** [Watch the Ajaia Docs walkthrough](https://youtu.be/jEK09wregSU)
- **GitHub repository:** [PRAZPC/ajaia-docs](https://github.com/PRAZPC/ajaia-docs) (`main`)
- **Hosted MVP:** [ajaia-docs-mvp.onrender.com](https://ajaia-docs-mvp.onrender.com/)
- **Google Drive code handoff folder:** [Open the project handoff folder](https://drive.google.com/drive/u/0/folders/1USsrAAWRcyZ84rPYf9xjOjvAG6hQjwpq)
- **Screenshot folder:** [Open the screenshot folder](https://drive.google.com/drive/u/0/folders/1W0d_LyfhipcKkO_5yf7RBJZQmNloCMhO)
- **Local run:** `npm install` is not needed; run `npm start`, then open `http://localhost:3000`.

The hosted MVP is running an earlier deployment. The latest source on GitHub includes the fixes and features listed below, but has not been redeployed. Render's current free service stores documents on an ephemeral filesystem, so redeploying can erase documents created on the live service. The local app and its JSON document store are available for reviewing the latest source safely.

## Reviewer quick start

1. Run `npm start` and open `http://localhost:3000`.
2. Choose a demo account: `alex@ajaia.demo`, `jamie@ajaia.demo`, or `taylor@ajaia.demo` (no password).
3. Create or open a document. Try formatting, `.txt`/`.md` import, comments, a text suggestion, and **Save version → History → Restore**.
4. Share with another demo account to inspect viewer/editor access and switch accounts from the header.
5. Run `npm test` and `npm run typecheck` for automated checks.

## Feature status

| Feature | Status | Review notes |
|---|---|---|
| Demo sign-in and account switching | Implemented | Seeded demo users; not production authentication. |
| Create, rename, edit, autosave, reopen | Implemented | Uses the existing JSON document store. |
| Rich-text editing | Implemented | Paragraphs, headings, bold, italic, underline, lists, quotes, and page breaks. |
| `.txt` and `.md` import | Implemented | Up to 1 MB; plain text preserves paragraphs and line breaks. Imports create a new document. |
| Markdown and PDF export | Implemented | Markdown download and browser print/save-as-PDF. |
| Sharing and access roles | Implemented | Owner can grant editor/viewer access; API enforces permissions. |
| Comments | Implemented | Document comments can include a selected-text reference. |
| Suggestion mode | Implemented | Collaborators can propose selected-text replacements; editors accept or reject. |
| Version history | Implemented | Explicit checkpoints and rate-limited snapshots during edits; restore keeps the pre-restore state. Up to 20 versions per document. |
| Automated checks | Passed | `npm test` and `npm run typecheck`; see [QA_REPORT.md](QA_REPORT.md). |

## Submission files

- [x] Source code in the GitHub repository
- [x] [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
- [x] [AI_WORKFLOW.md](AI_WORKFLOW.md), [DECISIONS.md](DECISIONS.md), and [ASSESSMENT_REVIEW.md](ASSESSMENT_REVIEW.md)
- [x] [WALKTHROUGH_SCRIPT.md](WALKTHROUGH_SCRIPT.md)
- [x] Demo video URL above
- [x] [Deployment guide and storage limitations](DEPLOYMENT.md)
- [ ] Screenshots: destination folder provided
- [x] Google Drive handoff folders linked above

## Known limitations

- Demo sign-in has no password and is intended for assessment testing only.
- Documents and comments, suggestions, and versions share the same local JSON store. There is no hosted database, backup, or multi-instance coordination.
- The Render Free service uses ephemeral storage. Live documents may disappear after idle, restart, or redeploy; use non-sensitive test content.
- The hosted URL has not been updated to the latest GitHub commit. Review the latest feature set locally unless the service is redeployed after preserving any live data.
- Pagination inserts breaks at editor block boundaries; a single long paragraph is not split internally.
- Import supports `.txt` and `.md`; it does not support DOCX, images, embedded media, or Markdown tables.
