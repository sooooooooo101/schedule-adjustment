# Claude Code — schedule-adjustment

- Work only on tasks explicitly requested by the Product Owner. Implement, test, and report briefly. Do not automatically trigger other AI agents, reviews, PR monitoring, scheduled checks, or handoff files.
- Follow `AGENTS.md` when changing code. Read only necessary files, keep diffs small, and avoid unrelated changes.
- For code changes, use a working branch and PR. Do not merge into `main`, deploy, or alter authentication/security settings without explicit Product Owner approval.
- `npm run build` runs database migrations. Verify the target database before execution. Never expose secrets or change production data without approval.
