# Claude Code — schedule-adjustment

- For implementation or design changes, first read and follow `AGENTS.md`. For an explicitly scoped handoff-only test (no code changes), read only the named files; state that `AGENTS.md` was not checked. Never edit app code under this exception.
- Work from the current task/PR. Start with `git status --short` and `git diff --name-only`, then inspect only relevant changed paths; avoid reading the entire repository.
- At the end of a task, update `.ai/handoff.md` in <= 150 words: outcome, changed paths, checks (run/not run), risks, next owner.
- Report uncertainty; never mark checks as passed unless run.
- Never publish secrets, merge, deploy, or change auth/database design without owner approval.
- WARNING: `npm run build` invokes migrations; verify the database target before running it.
