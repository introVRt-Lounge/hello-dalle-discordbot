# Hello DALL-E Discord Bot TODOs

## GitHub repo hardening (perfect-github-setup-and-operation skill — Public OSS)
- [ ] Re-enable CI: rename `.github/workflows/ci-cd.yml.disabled` → `ci.yml`, ensure lint+test gate runs on PRs
- [ ] Add `.gitleaks.toml` + `secret-scan` job
- [ ] Add `owasp-sast` Semgrep job (registry packs: `p/owasp-top-ten`, `p/typescript`, `p/javascript`, `p/secrets`)
- [ ] Aggregate `ci` job (needs lint/test + secret-scan + owasp-sast); branch-protect main against it
- [ ] Tier H via `gh api`: enable secret_scanning, push_protection, CodeQL default setup, private vulnerability reporting
- [ ] Tier A governance: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `AGENTS.md` with issue-gate block, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml`, `.github/pull_request_template.md`
- [ ] Tier B hygiene: `SUPPORT.md`, `CHANGELOG.md` (Keep a Changelog), `.editorconfig`, `.github/labels.yml` + sync workflow
- [ ] Tier H polish: `.github/FUNDING.yml`, `.github/social-preview.png` (1280x640)
- [ ] `REPO_SETTINGS.md` documenting all of the above

## Discord-bot skill (`discord-bot/SKILL.md`)
- [x] Slash commands registered globally only — no stale-globals dual-registration footgun
- [x] **Idempotent welcome on rejoin** — issue #81 (this branch)

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