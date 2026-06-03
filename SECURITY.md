# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in
`hello-dalle-discordbot`, **please do not open a public GitHub Issue.**

### Preferred: GitHub private advisory

1. Go to the repo's
   [Security tab](https://github.com/introVRt-Lounge/hello-dalle-discordbot/security/advisories).
2. Click **Report a vulnerability**.
3. Fill in the form; only repository maintainers can see your report.

This route gives us a private channel, an auto-assigned CVE if applicable,
and a coordinated disclosure timeline.

### Alternative: Discord DM

If you cannot use GitHub advisories, send a DM on Discord to a maintainer
of the **introVRt Lounge** server (look for the `Owner` or `Admin` role).
Include:

- A description of the vulnerability
- Steps to reproduce
- The bot version affected (`/version` or container tag)
- Your contact info for follow-up

We will acknowledge within **72 hours** and keep you updated on the fix.

## Scope

In scope:

- The published Docker image: `heavygee/hello-dalle-discordbot:*`
- The source code in this repository on the `main` branch
- The bot's behavior in production (introVRt Lounge Discord server)

Out of scope:

- Discord platform issues (report to Discord)
- OpenAI / Google Gemini API issues (report to the respective providers)
- Forks of this repo

## Secrets and runtime configuration

Never commit `.env`, `.env.test`, or any file containing real API keys,
Discord tokens, or OAuth secrets. The CI pipeline includes a `secret-scan`
job (gitleaks) that fails the build if secret-shaped strings are found.

If you accidentally push a secret:

1. **Rotate the credential immediately** at the issuing provider.
2. Open a private advisory describing the exposure window.
3. Do not just `git revert` - the secret stays in the git history.

## Supported versions

Only the latest minor version on `main` (and the corresponding
`heavygee/hello-dalle-discordbot:latest` Docker image) receives security
patches. Backports are not provided.
