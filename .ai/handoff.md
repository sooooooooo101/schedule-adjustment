# AI handoff — MVP

Task: Verify low-token GitHub handoff among ChatGPT → Claude Code (cloud) → Codex.
Status: SETUP READY; Claude/Codex execution not yet verified.
Branch: `mvp/token-efficient-ai-handoff`
From: ChatGPT
Next owner: Claude Code (cloud), then Codex
Changed paths: `CLAUDE.md`, `.ai/handoff.md`
Checks: GitHub branch and file creation only. No app tests/builds run.
Risks: A separate draft PR #6 updates `AGENTS.md`; do not modify it here.

Next actions:
1. Claude Code cloud: use this branch (not `main`), read `CLAUDE.md` and this file only; update **Status** to `CLAUDE COMPLETE` and add a brief test note after confirming your branch and working tree; commit/push.
2. Codex: review only the PR diff and this handoff. Report whether the changes are isolated, context is sufficient, and the claimed checks match evidence. Do not merge.
3. Owner: approve further automation only after the handoff test.

Rules: <=150 words for future handoff updates; avoid secrets and broad repo scans. Use Git/PR diffs rather than copying entire files into prompts.
