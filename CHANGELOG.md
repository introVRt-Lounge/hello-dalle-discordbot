# Changelog

All notable changes to this project will be documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are computed automatically by [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/)
on merge to `main`. The canonical, machine-generated history lives on the
[GitHub Releases](https://github.com/introVRt-Lounge/hello-dalle-discordbot/releases)
page; this file is the human-curated mirror starting from `1.13.0`.

## [Unreleased]

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

[Unreleased]: https://github.com/introVRt-Lounge/hello-dalle-discordbot/compare/v1.12.9...HEAD
