# Claude Code — schedule-adjustment

- Follow `AGENTS.md`. Work from the current task/PR and only open relevant files.
- Start with `git status --short`, `git diff --name-only`, then inspect only changed paths; avoid reading the entire repository.
- At the end of a task, update `.ai/handoff.md` in <= 150 words: outcome, changed paths, checks (run/not run), risks, next owner.
- Report uncertainty; never mark checks as passed unless run.
- Never publish secrets, merge, deploy, or change auth/database design without owner approval.
- WARNING: `npm run build` invokes migrations; verify the database target before running it.
