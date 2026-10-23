<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code Review Rules

- Review only the PR diff and `.ai/handoff.md`; flag P0/P1 issues (bugs, security, data loss, broken acceptance criteria).
- Do not push commits, approve, merge, enable auto-merge, or deploy. Report findings as review comments.
- Check that claimed checks match evidence; `npm run build` must not be run (it applies DB migrations).
