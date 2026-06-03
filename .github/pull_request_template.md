<!--
Thanks for contributing! A few requests before we review:

- Title should follow Conventional Commits (feat: / fix: / chore: / docs: / refactor: / test: / ci:)
- Body must reference an issue (e.g. "Fixes #123") unless this is a one-line typo or doc fix
- All CI checks must pass (lint, test, secret-scan, owasp-sast, ci aggregate)
-->

## Summary

<!-- 1-3 bullets describing WHAT changed and WHY. Implementation detail belongs below. -->

-

## Linked issue

Fixes #

## Test plan

- [ ] `npm test` passes locally
- [ ] If touching the welcome flow: tested via `/welcome ... destination:botspam` (debug mode, no #new-user spam)
- [ ] If touching image generation: integration test passes with at least one engine
- [ ] If touching the Dockerfile: `docker build --target test` and `--target production` both succeed
- [ ] If touching CI: ran `gitleaks detect` and `semgrep scan` locally where applicable

## Notes for reviewers

<!-- Anything tricky, risk, follow-ups, or rollback plan. -->
