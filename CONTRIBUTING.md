# Contributing to hello-dalle-discordbot

Thanks for considering a contribution! This bot powers welcome images and
profile-picture suggestions for the **introVRt Lounge** Discord server. The
public repo is the upstream and we do welcome external PRs.

## Issues-first

**No ticket, no workee.** Features and bugs require an open GitHub Issue
**before** implementation work.

- Feature: open a `Feature request` issue, describe the user-facing change.
- Bug: open a `Bug report` issue with reproduction steps and expected vs.
  observed behavior.
- One-line typo or comment-only doc edit: an issue is optional.

PRs without a linked issue may be asked to open one before review.

## Local setup

Prerequisites:

- Node.js 22 LTS (matches CI and runtime)
- Docker (optional, for running the bot in a container)

```bash
git clone https://github.com/introVRt-Lounge/hello-dalle-discordbot.git
cd hello-dalle-discordbot
cp .env.example .env       # then fill in values
npm ci
npm run start:dev
```

`.env` values you'll need to populate are documented in [README.md](./README.md#environment-variables).
Test-time fixtures live in `.env.test` (not committed).

## Development workflow

| Step | Command |
|---|---|
| Type-check | `npm run type-check` |
| Build | `npm run build` |
| Run tests | `npm test` |
| Run integration tests (live API calls, costs money) | `npm run test:integration` |
| Run dev bot | `npm run start:dev` |

Husky hooks are installed via `prepare` and enforce locally:

- `pre-commit`: TypeScript type-check on staged files
- `pre-push`: full Jest suite in both local and CI-simulated environments

To skip hooks for an emergency push, use `git push --no-verify` and explain
in the PR description.

## Branching and PRs

1. Branch off `main`. Names: `feat/<n>-short-desc`, `fix/<n>-short-desc`,
   `chore/<n>-short-desc`, `docs/<n>-short-desc`.
2. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   for commit messages and PR titles. Semantic-release uses these to compute
   the next version on merge to `main`.
   - `feat:` -> minor bump
   - `fix:` -> patch bump
   - `feat!:` or footer `BREAKING CHANGE:` -> major bump
3. PR body must include `Fixes #N` (or `Refs #N`) so the linked issue auto-
   closes on merge.
4. Branch protection on `main` requires:
   - Status check `ci` (lint + test + secret-scan + owasp-sast) green
   - At least 1 approval
   - Linear history (rebase or squash, no merge commits)
5. Squash-merge is the default; the branch is auto-deleted on merge.

## CI / security gates

Every PR runs (see `.github/workflows/ci.yml`):

| Job | What |
|---|---|
| `lint` | TypeScript type-check |
| `test` | Jest suite (40+ cases) |
| `secret-scan` | gitleaks 8.x with `.gitleaks.toml` allowlist |
| `owasp-sast` | Semgrep `1.122.0` against OWASP Top 10 + JS/TS + secrets + project rules |
| `ci` | Aggregate gate (required check for branch protection) |

`secret-scan` will catch secrets accidentally staged - including API keys,
Discord tokens, and OpenAI/Gemini keys. `owasp-sast` will reject patterns
like hard-coded secrets, missing Dockerfile `USER`, etc.

## Reporting security issues

Do **not** open a public issue for security vulnerabilities. See
[SECURITY.md](./SECURITY.md) for the private reporting path.

## Code of Conduct

Participation in this project is governed by our
[Code of Conduct](./CODE_OF_CONDUCT.md). By contributing you agree to
uphold it.

## Releasing

Releases are automatic via [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/)
on merge to `main`. The release workflow (`.github/workflows/release.yml`)
computes the next version from commit history, tags it, builds the Docker
image, and pushes to Docker Hub (`heavygee/hello-dalle-discordbot:<version>`).
Watchtower picks it up in production.

You should never need to bump the version manually. If a commit's prefix is
wrong, fix it before merge - that's what determines the bump.
