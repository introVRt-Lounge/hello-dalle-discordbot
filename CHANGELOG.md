# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are now cut **manually** by the `manual-publish.yml` workflow
(operator-triggered SemVer tags) and a rolling `:latest` is built on every
green push to `main` by `docker-latest.yml`. The legacy `semantic-release`
pipeline was removed in 1.32.0 (see issue #95). The canonical, machine-curated
history lives on the
[GitHub Releases](https://github.com/introVRt-Lounge/hello-dalle-discordbot/releases)
page; this file is the human-curated mirror starting from `1.13.0`.

## [Unreleased]

### Added

- F-lite supply-chain gate: `security-audit` job in `ci.yml` runs
  `npm audit --omit=dev --audit-level=high` and is part of the aggregate
  `ci` required check.
- Rolling Docker build workflow `docker-latest.yml` that publishes
  `:latest` (and traceable `:main-<sha>` tags) on every push to `main`,
  so Coolify keeps deploying without operator intervention.
- Manual SemVer release path documented in `REPO_SETTINGS.md` (release flow).

### Changed

- Branch protection `main` required check flipped from legacy `test`
  (release.yml) to the `ci` aggregate (lint + test + secret-scan +
  owasp-sast + security-audit).
- Dependabot batch: bumped `axios` (1.13.2 -> 1.17.0), `ws` (8.18.3 ->
  8.21.0), `handlebars` (4.7.8 -> 4.7.9), `minimatch` (3.1.2 -> 3.1.5),
  `follow-redirects` (1.15.6 -> 1.16.0), `lodash` (4.17.21 -> 4.18.1),
  `lodash-es` (4.17.21 -> 4.18.1), and the minor-and-patch group across
  PRs #79, #91-#94, #100-#102. Cleared 40+ open Dependabot alerts; the
  remainder are dev-only transitives (`semantic-release`, `jest` chain)
  and never reach production.

### Removed

- `.github/workflows/release.yml` (semantic-release driver). Root cause:
  a destructive `git filter-repo` (coverage scrub) invalidated the
  merge-base between old release tags and `main`, so semantic-release
  kept trying to publish an orphan `v1.0.0` (issue #95). Replaced by
  `docker-latest.yml` + `manual-publish.yml`.

## [1.31.3] - 2026-06-03

### Added

- `data/welcomedUsers.json` persistence so users who leave and rejoin do
  not trigger a fresh welcome image generation. (#81, PR #82)
- Lean `ci.yml` PR gate with lint, test, gitleaks `secret-scan`, Semgrep
  `owasp-sast`, and an aggregate `ci` job for branch protection. (#83, PR #87)
- Tier A governance: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`,
  `AGENTS.md`, `.github/ISSUE_TEMPLATE/`, `.github/pull_request_template.md`.
  (#84, PR #88)
- Tier B hygiene: this `CHANGELOG.md`, `SUPPORT.md`, `.editorconfig`,
  `.github/labels.yml` + `label-sync` workflow. (#85, this PR)

### Changed

- Rejoin greeting moved from `#botspam` (admin-only) to the user-facing
  welcome channel; respects `STEALTH_WELCOME` for mention behavior.
- `Dockerfile` now drops to `USER node` in both the test and production
  stages (was running as root). Full Dockerfile modernization tracked
  in #86.
- `package.json` `"license"` corrected from `"ISC"` to `"MIT"` to match
  the authoritative `LICENSE` file.

### Removed

- Dead `.github/workflows/ci-cd.yml.disabled` file.

## Older history

Releases prior to this curated changelog (`1.0.0` through `1.12.9`) live
on the [GitHub Releases page](https://github.com/introVRt-Lounge/hello-dalle-discordbot/releases).

[Unreleased]: https://github.com/introVRt-Lounge/hello-dalle-discordbot/compare/v1.31.3...HEAD
[1.31.3]: https://github.com/introVRt-Lounge/hello-dalle-discordbot/compare/v1.31.2...v1.31.3
