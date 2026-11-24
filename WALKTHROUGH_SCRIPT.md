# Reviewer walkthrough — 4 minutes

The submitted demo video is [here](https://youtu.be/jEK09wregSU). Use this sequence to review the latest GitHub source locally; the hosted MVP has not been updated to the latest commit.

| Time | Demonstrate | Notes |
|---|---|---|
| 0:00–0:25 | Start `npm start`, open localhost, choose Alex | Demo accounts are passwordless and seeded for assessment use. |
| 0:25–1:10 | Create a document, rename it, apply a heading and bold, type enough to see autosave | Wait for the Saved indicator. The local JSON store persists across a local server restart. |
| 1:10–1:40 | Import a `.txt` or `.md` file; show the formatting toolbar scrolls on a narrow viewport | Imports preserve plain-text paragraphs and line breaks; Markdown headings/lists/emphasis are converted. |
| 1:40–2:20 | Select text, post a comment, submit a replacement suggestion | Shared collaborators can comment and suggest. |
| 2:20–2:55 | Sign in as an editor or return to Alex; accept/reject a suggestion | Accepting a suggestion saves the pre-change document as a version. |
| 2:55–3:25 | Save version, make a small edit, open History, restore a snapshot | History includes manual checkpoints and rate-limited snapshots during continued edits; restore preserves the pre-restore state. |
| 3:25–4:00 | Share with another demo account and run `npm test` | The API enforces viewer/editor permissions. Mention ephemeral storage and demo-auth limitations. |

Use non-sensitive test content. The Render Free service uses ephemeral storage; do not rely on documents surviving idle, restart, or redeploy. See [SUBMISSION.md](SUBMISSION.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
