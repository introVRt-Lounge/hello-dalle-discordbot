## Build Plan: Migrating Versioning and Docker Push to GitHub Actions

### Objective
To replace the manual `increment_version.sh` and `hubpush.sh` scripts with a single, automated GitHub Actions workflow that handles version incrementing, code quality checks, Docker image building, tagging, and pushing to Docker Hub based on Git tags.

### Current State
- `helpers/increment_version.sh`: Increments version in `package.json`, runs TypeScript compilation, `npm audit fix`, `npm test`, updates `version_info.json`, commits and pushes changes to `main`.
- `helpers/hubpush.sh`: Builds Docker image, tags with version from `package.json`, pushes `latest` and versioned tags to Docker Hub.

### Proposed Solution: GitHub Actions Workflow
We will create a GitHub Actions workflow (`.github/workflows/release.yml`) that will be triggered on specific events (e.g., pushing to `main` or creating a release).

### Phases

#### Phase 1: Setup GitHub Actions Workflow
1. Create the `.github/workflows` directory.
2. Create `release.yml` inside the `.github/workflows` directory.
3. Define the workflow trigger (e.g., `on: push` to `main` or `on: release`).

#### Phase 2: Integrate Versioning and Code Quality Checks
1. **Version Increment:** Implement logic within the GitHub Action to increment the version based on a strategy (e.g., using a GitHub Action for semantic release or a custom script).
2. **Run Tests:** Add steps to run `npm install`, `npx tsc`, `npm audit fix`, and `npm test` within the workflow.
3. **Update `version_info.json`:** Add steps to update `version_info.json` and commit these changes back to the repository.
4. **Commit and Tag:** Commit the version changes and create a new Git tag (e.g., `vX.Y.Z`).

#### Phase 3: Docker Image Build and Push
1. **Docker Login:** Add a step to log in to Docker Hub using GitHub Secrets for credentials.
2. **Build Docker Image:** Build the Docker image within the workflow.
3. **Tag Docker Image:** Tag the Docker image with the new version and `latest`.
4. **Push to Docker Hub:** Push both the versioned and `latest` images to Docker Hub.

#### Phase 4: Clean Up
1. Remove the `helpers/increment_version.sh` and `helpers/hubpush.sh` scripts after successful implementation and testing of the GitHub Action.

### Dependencies
- GitHub Secrets for Docker Hub credentials.
- Existing `package.json` and `version_info.json` structure.

### Testing
- Manually trigger the workflow.
- Verify that `package.json` and `version_info.json` are updated correctly.
- Verify that Docker images are built, tagged, and pushed to Docker Hub correctly.
- Verify that a new Git tag is created. 