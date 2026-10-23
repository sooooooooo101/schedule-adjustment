# Claude Code — schedule-adjustment

- Work only on tasks explicitly requested by the Product Owner. Implement, test, and report briefly. Do not automatically trigger other AI agents, reviews, PR monitoring, scheduled checks, or handoff files.
- Follow `AGENTS.md` when changing code. Read only necessary files, keep diffs small, and avoid unrelated changes.
- For code changes, use a working branch and PR. Do not merge into `main`, deploy, or alter authentication/security settings without explicit Product Owner approval.
- `npm run build` runs database migrations. Verify the target database before execution. Never expose secrets or change production data without approval.

## AI workflow (Issue #10)

| Role | Does | Never |
|---|---|---|
| Claude Code | implement, test, draft PR, update `.ai/handoff.md` | merge, enable auto-merge, deploy, `npm run build` |
| Codex | review PR diff | push fixes |
| Antigravity | final QA | change code |
| Product Owner | merge to `main` (= production deploy) | — |

- Max 2 fix loops per PR; after that, stop and hand back to the Product Owner.
- Share state only via Issue, PR and `.ai/handoff.md`. Record tokens/cost only when measured; otherwise "not measurable".
- `.claude/settings.json` denies merge/deploy tools; do not work around it.
