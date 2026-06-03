# AGENTS.md

Coding agents (Claude, Cursor, Codex, etc.) working in this repository must
follow the rules below. Human contributors should follow CONTRIBUTING.md.

## Issues-first workflow (mandatory)

**No ticket, no workee.** Do not implement features or bugfixes requested in
chat until a tracking GitHub Issue exists.

| Request in chat | Agent action |
|-----------------|--------------|
| New feature | Create issue (`feat: ...`) via `gh issue create`, then branch |
| Bug / regression | Create issue (`fix: ...`), then branch |
| Question / explanation only | Answer; no issue required |
| Docs typo (one line) | Fix directly; issue optional |

Before writing implementation code:

1. Confirm repo has a GitHub remote and `gh` is authenticated as the
   identity that owns the repo.
2. Open or find the issue; note the number.
3. Branch name should include the issue number when practical
   (`feat/123-short-name`, `fix/123-short-name`).
4. PR body must include `Fixes #N`.

**Exceptions** (no issue required):

- Operator explicitly says "skip issue" or "no ticket".
- One-line typos, comment-only edits, or doc fixes with no behavior change.
- Active production incident when the operator declares hotfix mode.

If the operator describes substantive work but no issue exists,
**create the issue first**, paste the URL back, then proceed.

## Bot persona

This repo carries a `.cursor/rules/hello-dalle-bot-persona.mdc` rule that
asks the agent to respond in character as the hello-dalle Discord bot.
That's a flavor preference for chat output; it does **not** override the
issues-first workflow above, the security gates, or any test/CI discipline.

## Identity (heavygee only)

This repo lives under the **heavygee** identity. See
`.cursor/rules/identity-heavygee-only.mdc` for the full policy.

Short version:

- Git author/committer: `HeavyGee <133152184+heavygee@users.noreply.github.com>` only.
- `gh` CLI: default (heavygee). Never `gh-ll` (gavinc) or `gh-chad` (sterlingchad).
- Docker Hub: `heavygee/hello-dalle-discordbot` is heavygee's namespace.
  **Do not authenticate to Docker Hub from this host with any other
  identity** - not even for a manifest probe. Use the `manual-publish`
  GitHub Actions workflow when a push is needed.
- If you lack the right credentials, surface it as a blocker. Do not
  improvise with whatever identity happens to be loaded.

## CI / security discipline

Every PR must pass:

- `lint` (TypeScript type-check)
- `test` (jest)
- `secret-scan` (gitleaks)
- `owasp-sast` (Semgrep OWASP Top 10 + JS/TS + secrets + project rules)
- `ci` aggregate gate

If a Semgrep rule flags a real issue in code under your control, **fix the
issue**. Do not suppress the rule with `# nosemgrep:` unless the operator
explicitly approves.

If the gate flags a false positive on an unrelated file, add a path entry
to `.semgrepignore` (not a per-line suppression) and explain in the PR body.

## Conventional commits

Semantic-release computes the next version from commit messages on `main`:

- `feat:` -> minor bump
- `fix:` -> patch bump
- `feat!:` or `BREAKING CHANGE:` footer -> major bump
- Other prefixes (`chore:`, `docs:`, `refactor:`, `test:`, `ci:`) -> no bump

Get the prefix right. If in doubt, ask the operator before commit, not after.

## Secrets

Never commit `.env`, `.env.test`, or anything resembling a Discord bot token,
OpenAI key, or Gemini key. The pre-commit type-check is fast; the pre-push
hook runs the full Jest suite twice (local + CI-sim) before the push leaves
the machine. The `secret-scan` job in CI is the third line of defense.

If you discover a leaked credential in any branch:

1. Tell the operator immediately. **Do not push** to a branch that
   contains the leak.
2. Rotate the credential at the issuing provider.
3. Rewrite history if needed (operator approves).

## What the agent should NOT do without explicit operator approval

- Force-push to `main`.
- Disable CI workflows.
- Commit anything from the operator's home directory or workspace files
  outside this repo.
- Approve / merge their own PRs (operator must review).
- Create releases or tags manually (semantic-release owns this).
- Toggle branch protection rules.

## What the agent SHOULD do proactively

- Run tests locally before pushing.
- Update `TODO.md` when work completes or new follow-ups surface.
- Open follow-up issues when scope creep would otherwise pollute the
  current PR.
- Pin Docker / GitHub Action versions instead of using floating tags.
- Use `gh` (not curl + manual JSON) for GitHub API operations.
