# AI handoff — MVP

Task: Validate GitHub-based, low-context handoff between AI tools.
Status: CLAUDE COMPLETE / CHATGPT REVIEWED (Codex session not yet run)
Branch: `mvp/token-efficient-ai-handoff`
From: Claude Code (cloud) → ChatGPT (GitHub review)
Next owner: Codex or Product Owner

Claude result: commit `702f214` pushed; only `.ai/handoff.md` changed. Claude reports reading `CLAUDE.md` and this file, clean pre-edit worktree, and no tests/builds/DB/deployment.
ChatGPT verification: commit, changed paths and PR #7 diff checked on GitHub. Claude's local shell activity was not independently observed. `CLAUDE.md` was clarified in `da3dabc`: handoff-only smoke tests may omit `AGENTS.md`, but code/design work must read it.

Next: Codex may independently review PR #7's diff and this handoff without full-repo scan. Product Owner decides whether to merge or automate further. No app tests or deployment performed.

Constraints: update handoff <=150 words, never include secrets, avoid broad file reads, no automatic merge/deploy.
