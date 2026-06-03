# Hello DALL-E Discord Bot TODOs

## GitHub repo hardening (perfect-github-setup-and-operation skill)

### Public OSS baseline - DONE 2026-06
- [x] Tier A governance: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `AGENTS.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml`, `.github/pull_request_template.md` (PR #88, issue #84)
- [x] Tier B hygiene: `SUPPORT.md`, `CHANGELOG.md`, `.editorconfig`, `.github/labels.yml` + `label-sync` workflow (PR #89, issue #85)
- [x] Tier C CI: lean `ci.yml` with `lint`, `test`, `secret-scan` (gitleaks), `owasp-sast` (Semgrep), aggregate `ci` job (PR #87, issue #83)
- [x] Tier H platform: secret scanning + push protection enabled, CodeQL default setup (actions + javascript + typescript), Code Quality (preview) configured, private vulnerability reporting on, dependabot alerts + security updates on (gh api flips, see `REPO_SETTINGS.md`)
- [x] Dockerfile modernization: `node:22-bookworm-slim` LTS pin, `npm ci`, multi-stage with `deps`/`build`/`test`/`prod-deps`/`runtime`, `USER node`, healthcheck, `.dockerignore` updated (PR for issue #86)
- [x] Social preview image at `.github/social-preview.png` (1280x640) - committed; **operator must upload via Settings -> General -> Social preview**
- [x] License mismatch fixed (`package.json` "ISC" -> "MIT" to match `LICENSE` file)
- [x] `REPO_SETTINGS.md` canonical record of all platform-side toggles

### Operator follow-up
- [ ] Approve & merge PRs #82 (rejoiner bug), #87 (CI), #88 (Tier A), #89 (Tier B), and the #86 PR (Dockerfile + Tier H polish)
- [ ] After CI green: flip branch protection required check from `test` (release.yml) to `ci` (ci.yml)
- [ ] Upload `.github/social-preview.png` via Settings -> General -> Social preview (one-time UI action)
- [ ] Decide on Sponsorships: GitHub Sponsors / Ko-fi / skip. If yes, follow the ritual in REPO_SETTINGS.md
- [ ] Triage 54 Dependabot alerts on default branch (1 critical, 25 high). Many will likely auto-resolve via the security-updates PRs that Dependabot opens once the queue catches up

### Discord-bot skill
- [x] Slash commands registered globally only - no stale-globals dual-registration footgun
- [x] Idempotent welcome on rejoin (PR #82, issue #81)

## User Interaction Improvements
- [ ] Add reaction-based interactions for profile picture acceptance/rejection
- [ ] Allow users to request regeneration of their welcome/profile images
- [ ] Add user commands for different style/theme preferences
- [ ] Create profile picture galleries for users to choose from multiple options

## Analytics & Tracking
- [ ] Track profile picture adoption rates
- [ ] Store and analyze most successful/popular generated images
- [ ] Monitor user engagement metrics with welcome/profile images
- [ ] Create analytics dashboard for admins
- [ ] Track generation costs and usage patterns

## Role-Based Customization
- [ ] Incorporate user roles (assigned during onboarding) into image generation prompts
- [ ] Allow different prompt templates based on assigned roles
- [ ] Support role-specific visual themes or elements
- [ ] Enable role-based watermarks or badges in generated images

## Technical Improvements
### Performance
- [ ] Implement image caching system for common components
- [ ] Add request queuing system for handling multiple generations
- [ ] Implement rate limiting for commands
- [ ] Add batch processing for multiple users
- [ ] Create resource usage monitoring system

### Storage & Backup
- [ ] Implement backup system for generated images
- [ ] Add image archival system with cleanup policies
- [ ] Create CDN integration for image serving

### AI Enhancements
- [ ] Add style transfer from existing server images
- [ ] Implement theme matching with server branding
- [ ] Add seasonal/event-based image variations
- [ ] Support multiple AI models (e.g., Stable Diffusion fallback)
- [ ] Enhance prompt engineering for more consistent results

## Administrative Features
- [ ] Create admin dashboard for viewing generation statistics
- [ ] Add bulk generation tools for server admins
- [ ] Implement custom watermark management system
- [ ] Add prompt blacklist/whitelist system
- [ ] Create cost management and budget controls

## User Customization
- [ ] Allow users to set preferred image styles
- [ ] Enable custom prompt additions/modifications
- [ ] Support user-specific theme preferences
- [ ] Add favorite styles tracking

## Quality of Life Features
- [ ] Add preview system for generated images before posting
- [ ] Implement undo/redo for recent generations
- [ ] Add image modification requests (brightness, contrast, etc.)
- [ ] Create help documentation and user guides

## Integration Features
- [ ] Add custom event triggers for special occasions
- [ ] Create API endpoints for external integrations
- [ ] Support webhook notifications for image generation
- [ ] Enable cross-server style sharing

## Maintenance & Monitoring
- [ ] Add automated testing for image generation
- [ ] Implement performance monitoring and alerts
- [ ] Create automated backup verification
- [ ] Add system health checks and reporting

## Cost Optimization
- [ ] Implement smart caching to reduce API calls
- [ ] Add cost tracking per generation
- [ ] Create budget alert system
- [ ] Optimize image sizes and quality settings

Each feature should be evaluated for:
- Implementation complexity
- Resource requirements
- User benefit
- Maintenance overhead
- Cost implications

Priority should be given to features that:
1. Improve user experience
2. Reduce operational costs
3. Enhance system reliability
4. Add measurable value to server communities 