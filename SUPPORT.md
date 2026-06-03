# Support

Need help with hello-dalle-discordbot? Here's where to go.

## Discord (fastest)

The bot lives in **introVRt Lounge** Discord. Casual questions, deployment
help, screenshots of weird behavior - drop them in `#bots-and-tech` (or
DM a server admin). You'll usually get a reply same-day.

Invite: https://discord.gg/introvrt

## GitHub Issues (for tracked work)

- **Bug?** Open a [bug report](https://github.com/introVRt-Lounge/hello-dalle-discordbot/issues/new?template=bug_report.yml).
- **Feature idea?** Open a [feature request](https://github.com/introVRt-Lounge/hello-dalle-discordbot/issues/new?template=feature_request.yml).
- **Security vulnerability?** Use the [private advisory flow](https://github.com/introVRt-Lounge/hello-dalle-discordbot/security/advisories/new) - **never** the public bug tracker.

Per [CONTRIBUTING.md](./CONTRIBUTING.md), features and bugs require an issue
before any PR work begins ("no ticket no workee"). One-line typos and doc
fixes can skip the issue.

## Self-hosters

Most "the bot doesn't post images" reports trace back to:

1. **API key missing or out of credit** - check container logs for
   `OPENAI_API_KEY is not set` or `quota exceeded`.
2. **Channel ID typos** - `WELCOME_CHANNEL_ID` and `BOTSPAM_CHANNEL_ID`
   must be the numeric channel IDs (right-click channel -> Copy ID with
   developer mode on), not channel names.
3. **Missing intents** - the bot needs `SERVER_MEMBERS_INTENT` and
   `MESSAGE_CONTENT_INTENT` enabled in the Discord developer portal.
4. **`POSTING_DELAY` confusion** - the bot intentionally waits 2 minutes
   (default) before posting to `#welcome` so the user sees onboarding
   first. Check `#botspam` for confirmation that the image was generated.

Full env-var reference and Docker setup live in [README.md](./README.md).
Production-deployment specifics: [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md).

## Costs

Image generation isn't free. Approximate per-image costs:

- DALL-E 3: ~$0.04 / image
- Gemini (image-to-image, 2 calls): ~$0.08 / image

If you're seeing unexpected billing, check `#botspam` for the cost-monitoring
report and look for runaway loops (e.g. the same user re-triggering welcomes -
that's the bug fixed in PR #82).

## Things we will NOT help with

- Building a different Discord bot from this codebase (fork it; we won't
  customize for your server)
- Bypassing Discord's rate limits or terms of service
- Generating images that violate OpenAI / Google content policies
