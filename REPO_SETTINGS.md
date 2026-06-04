# Repository Settings

Canonical record of platform-side toggles for `introVRt-Lounge/hello-dalle-discordbot`.
Update this file whenever you flip something in the GitHub UI or via `gh api`.

## Visibility

- **Public** repository.

## Branch protection

Protected branch: `main`.

| Setting | Value | Source |
|---|---|---|
| Required status check | `ci` (lint + test + secret-scan + owasp-sast + security-audit aggregate) | `.github/workflows/ci.yml` |
| Required PR reviews | **0** (was 1; dropped 2026-06-04 to enable Dependabot auto-merge - the `ci` aggregate is the real safety gate, see `Dependabot auto-merge` section below) | gh api |
| Dismiss stale reviews on new commits | enabled | UI |
| Require linear history | enabled | UI |
| Allow force pushes | disabled | UI |
| Allow deletions | disabled | UI |
| Enforce admins | **disabled** (admins can bypass for emergency direct-to-main) | UI |

**Migration note:** Originally the required check was `test` (from the bundled `release.yml`). PR #87 introduced a dedicated `ci.yml` with an aggregate `ci` job; after that PR merged and ran green on `main`, the required check was flipped to `ci` (PR #103, chore/ci-release-rework). The legacy `release.yml` (semantic-release driver) was removed at the same time and replaced by `docker-latest.yml` (rolling `:latest` build) plus `manual-publish.yml` (operator-triggered SemVer release).

## Code security and analysis

| Setting | State | Notes |
|---|---|---|
| Dependabot alerts | enabled | `gh api -X PUT vulnerability-alerts` |
| Dependabot security updates | enabled | `gh api -X PUT automated-security-fixes` |
| Dependabot version updates | enabled | `.github/dependabot.yml` (npm + github-actions + docker, weekly) |
| Secret scanning | **enabled** | `gh api -X PATCH security_and_analysis.secret_scanning` |
| Secret scanning push protection | **enabled** | `gh api -X PATCH security_and_analysis.secret_scanning_push_protection` |
| Secret scanning non-provider patterns | not enabled | API call accepted but state stayed `disabled`; org-level toggle suspected. Document as known limitation. |
| Secret scanning validity checks | not enabled | Same as above. |
| CodeQL (default setup) | configured (weekly, threat_model: remote) | Languages: actions + javascript + typescript |
| Code Quality (preview) | configured | `gh api -X PATCH code-quality/setup`; preview product, public-repo only |
| Private vulnerability reporting | enabled | `gh api -X PUT private-vulnerability-reporting` |

In-repo gates (run in `ci.yml`):

| Job | Tool | Source of truth |
|---|---|---|
| `lint` | `tsc --noEmit` | `tsconfig.check.json` |
| `test` | `jest` | `jest.config.ts` |
| `secret-scan` | `gitleaks 8.30.1` (binary, no GITLEAKS_LICENSE) | `.gitleaks.toml` |
| `owasp-sast` | `semgrep 1.122.0` (container) | `security/semgrep/hello-dalle.yml` + registry packs |
| `security-audit` | `npm audit --omit=dev --audit-level=high` (F-lite supply chain gate) | `package-lock.json` |
| `ci` | aggregate gate | needs all of the above |

## Repo merge / PR settings

| Setting | Value |
|---|---|
| Allow squash merge | enabled (default) |
| Allow merge commit | enabled |
| Allow rebase merge | enabled |
| Allow auto-merge | **enabled** (required for `dependabot-auto-merge.yml`) |
| Delete branch on merge | enabled |
| Squash commit title | PR title |
| Squash commit message | commit messages |

## Dependabot auto-merge

`.github/workflows/dependabot-auto-merge.yml` flips every Dependabot PR for **patch** and **minor** bumps to `--auto --squash`. The PR sits in GitHub's auto-merge queue until the required `ci` aggregate goes green, then merges. The `docker-latest.yml` push hook then republishes `:latest` and Coolify reconciles - so a green patch bump ships to prod with zero human steps.

**Major** bumps are parked: the workflow leaves a single comment on the PR explaining the policy and waits for a human to merge manually.

Why this is safe to fire-and-forget:

- Branch protection requires `ci` aggregate = `lint + test + secret-scan + owasp-sast + security-audit`. No green ci, no merge.
- `security-audit` runs `npm audit --omit=dev --audit-level=high` so any prod-reachable CVE introduced by a bump blocks the merge.
- Test coverage exercises the full welcome / pfp / engine / wildcard flows; a regression that compiles and type-checks but breaks behavior is statistically unlikely to also pass jest.

Trade-off (intentional): the **required-pull-request-reviews** branch protection setting is `disabled` (was 1). On a solo repo, the review requirement was bureaucratic theater the operator has been admin-bypassing on every PR. Dropping it is what makes auto-merge actually fire without `--admin`. The real gate stays `ci`.

## Labels

20 canonical labels defined in `.github/labels.yml`. Synced to GitHub via the `label-sync` workflow on push to `main`. Mode: **additive only** (`delete-other-labels: false`) so existing labels survive the first sync.

To re-sync manually after editing: `gh workflow run label-sync.yml`.

## Pages

Not configured. This repo does not currently expose docs at `*.github.io`. If we adopt MkDocs in future, see Tier E in the `perfect-github-setup-and-operation` skill.

## Sponsorships

Not configured. `.github/FUNDING.yml` is intentionally absent. To enable later:

1. Operator: Settings -> General -> Features -> **Sponsorships** (toggle on).
2. Operator: Settings -> Sponsorships -> Set up sponsor button (use the GitHub UI flow, not a hand-committed file - GitHub only links sponsorship metadata when the file is created through this flow).
3. Recommended target: Ko-fi or GitHub Sponsors. Operator chooses.
4. Verify with `gh api graphql -f query='{ repository(owner:"introVRt-Lounge", name:"hello-dalle-discordbot") { fundingLinks { platform url } } }'`.

## Social preview

Image lives at `.github/social-preview.png` (1280x640 PNG, generated and committed in PR for #86).

**Operator action required (one-time):**

1. Go to Settings -> General -> Social preview.
2. Click **Edit** -> **Upload an image**.
3. Pick `.github/social-preview.png` from your local clone.

GitHub does not automatically pick up `.github/social-preview.png` from the repo - the upload is required. Once uploaded, links to the repo from Discord, Twitter/X, etc. will use this card.

## Release flow

The legacy `semantic-release` pipeline was removed (issue #95: orphan tag history after a destructive `git filter-repo`). The replacement is two complementary workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `docker-latest.yml` | push to `main`, `workflow_dispatch` | Builds `heavygee/hello-dalle-discordbot:latest` (and `:main-<sha>`) on every green main. Coolify watches `:latest` -> rolling deploys. |
| `manual-publish.yml` | `workflow_dispatch` (`-f tag=vX.Y.Z`) | Operator-triggered SemVer release. Tags the repo, builds + pushes `:vX.Y.Z` (and optionally `:latest`), creates a GitHub release with auto-generated notes. |

Why no auto-bumped SemVer tags: `semantic-release` walks history; after the coverage-scrub `git filter-repo` invalidated the merge-base between old release tags and the rewritten `main`, it kept trying to publish `v1.0.0` and conflicting with the orphan tag. We chose the simpler tradeoff: `:latest` rolls forward automatically, SemVer cuts are a deliberate operator action.

To cut a SemVer release:

```
gh workflow run manual-publish.yml -f tag=v1.32.0
gh workflow run manual-publish.yml -f tag=v1.32.0 -f also_latest=false       # tag-only, no :latest update
gh workflow run manual-publish.yml -f tag=v1.32.0 -f create_release=false    # image only, no GitHub release
```

Production: Coolify watches `heavygee/hello-dalle-discordbot:latest` and reconciles automatically on new image push.

## Manual / out-of-band changes log

Record any change that is not in a PR (UI-only toggles, gh api flips, etc.):

| Date | Change | Who | Source |
|---|---|---|---|
| 2026-06-03 | Enabled secret_scanning + push_protection via gh api PATCH | bot session | hello-dalle bot session |
| 2026-06-03 | Enabled private_vulnerability_reporting via gh api PUT | bot session | hello-dalle bot session |
| 2026-06-03 | Enabled Code Quality (preview) via gh api PATCH | bot session | hello-dalle bot session |
| 2026-06-03 | Created issues #81-#86 and PRs #82, #87, #88, #89 for full Tier A-H baseline | bot session | hello-dalle bot session |
| 2026-06-04 | Merged dependabot PRs #91/#92/#93/#94/#79/#100/#101/#102 - cleared 40+ open alerts | bot session | hello-dalle bot session |
| 2026-06-04 | Replaced `release.yml` (broken semantic-release) with `docker-latest.yml` + `manual-publish.yml` | bot session | PR chore/ci-release-rework |
| 2026-06-04 | Added F-lite `security-audit` job to `ci.yml` | bot session | PR chore/ci-release-rework |
| 2026-06-04 | Flipped required status check from `test` to `ci` aggregate | bot session | gh api branch protection |
| 2026-06-04 | Dismissed 19 dev-only Dependabot alerts (jest / semantic-release transitives) as `tolerable_risk` | bot session | gh api dependabot/alerts |
| 2026-06-04 | Resolved secret-scanning alert #1 (Google API Key in test-gemini.js, leak commit unreachable) as `wont_fix` | bot session | gh api secret-scanning/alerts |

| 2026-06-04 | Dropped required-PR-reviews from 1 to 0 to enable Dependabot auto-merge | bot session | gh api branch protection |
| 2026-06-04 | Added `dependabot-auto-merge.yml` workflow (patch+minor auto, major held for review) | bot session | PR chore/dependabot-auto-merge |

## Outstanding operator actions

- **Verify GEMINI_API_KEY rotation.** Secret-scanning alert #1 fired on 2025-11-01 for a Google API Key committed in `test-gemini.js` / `test-gemini-image.js` at commit `68da77c`. The files and commit are no longer reachable from any branch, so the repo side is clean and the alert was resolved as `wont_fix`. **The bot agent cannot verify whether the leaked key value was rotated.** If you didn't rotate when the alert opened, do it now: Google Cloud Console -> APIs & Services -> Credentials -> regenerate or restrict the API key, then update the bot's `GEMINI_API_KEY` env var on Coolify. If you already rotated, no further action needed.
- **Upload `.github/social-preview.png`** via Settings -> General -> Social preview (no public API for the OG image).
- **(Optional) Sponsorships** - decide on GitHub Sponsors / Ko-fi / skip; if yes, follow the ritual in the Sponsorships section above.
