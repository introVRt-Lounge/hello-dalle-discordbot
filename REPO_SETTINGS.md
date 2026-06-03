# Repository Settings

Canonical record of platform-side toggles for `introVRt-Lounge/hello-dalle-discordbot`.
Update this file whenever you flip something in the GitHub UI or via `gh api`.

## Visibility

- **Public** repository.

## Branch protection

Protected branch: `main`.

| Setting | Value | Source |
|---|---|---|
| Required status check | `ci` (lint + test + secret-scan + owasp-sast aggregate) | `.github/workflows/ci.yml` |
| Required PR reviews | 1 | UI |
| Dismiss stale reviews on new commits | enabled | UI |
| Require linear history | enabled | UI |
| Allow force pushes | disabled | UI |
| Allow deletions | disabled | UI |
| Enforce admins | **disabled** (admins can bypass for emergency direct-to-main) | UI |

**Migration note:** Originally the required check was `test` (from the bundled `release.yml`). PR #87 introduced a dedicated `ci.yml` with an aggregate `ci` job; after that PR merged and ran green on `main`, the required check was flipped to `ci`. The redundant `test` job in `release.yml` can now be dropped (follow-up PR).

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
| `ci` | aggregate gate | needs all of the above |

## Repo merge / PR settings

| Setting | Value |
|---|---|
| Allow squash merge | enabled (default) |
| Allow merge commit | enabled |
| Allow rebase merge | enabled |
| Allow auto-merge | disabled |
| Delete branch on merge | enabled |
| Squash commit title | PR title |
| Squash commit message | commit messages |

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

- `semantic-release` on push to `main` analyzes commit history and computes the next version.
- Tag pattern: `v<major>.<minor>.<patch>`.
- Docker Hub: `heavygee/hello-dalle-discordbot:<version>` and `:latest`.
- GHCR: not currently used (workflow name says GHCR, target is Docker Hub - cosmetic naming bug).
- Production: Watchtower pulls `:latest` and recreates the container.

## Manual / out-of-band changes log

Record any change that is not in a PR (UI-only toggles, gh api flips, etc.):

| Date | Change | Who | Source |
|---|---|---|---|
| 2026-06-03 | Enabled secret_scanning + push_protection via gh api PATCH | bot session | hello-dalle bot session |
| 2026-06-03 | Enabled private_vulnerability_reporting via gh api PUT | bot session | hello-dalle bot session |
| 2026-06-03 | Enabled Code Quality (preview) via gh api PATCH | bot session | hello-dalle bot session |
| 2026-06-03 | Created issues #81-#86 and PRs #82, #87, #88, #89 for full Tier A-H baseline | bot session | hello-dalle bot session |
