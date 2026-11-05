# Repository Information

This is a Node.js 22 HTTP service written in TypeScript and built with Express.

## Available Tools

- **npm** manages project dependencies and runs the commands below.
- **TypeScript** provides static type checking.
- **esbuild** bundles the production application into `dist/index.js`.

## npm Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Runs the service from TypeScript source and restarts when files change. |
| `npm run typecheck` | Checks TypeScript types without creating output files. |
| `npm run build` | Type-checks and bundles the service for production. |
| `npm start` | Runs the built service from `dist/index.js`. |

## Code Style and Preferences

Follow the guidance below when generating code for this repository.

## Pull request gates

Before drafting, creating, updating, or marking a PR ready, load and follow [jira-pr-scope-check](skills/jira-pr-scope-check/SKILL.md) and [pre-pr-validation](skills/pre-pr-validation/SKILL.md). Check the complete proposed PR diff against confirmed Jira requirements and run actual lint, tests, and build/type-check for that revision. Both gates must independently PASS or have explicit user-approved exceptions before drafting or publishing. Disclose scope and validation overrides separately and prominently in the PR body; a scope override does not override validation failures. Recheck after changes, never remove work or alter Jira criteria to force a pass without approval, and require both gates before any Jira review transition.
