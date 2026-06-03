# Multi-stage Dockerfile for hello-dalle-discordbot.
# - test stage: builds and runs jest against the app
# - production stage: runtime image; runs as a non-root user
# Full modernization (LTS pin, npm ci, slim base, layer-cache cleanup, healthcheck)
# tracked in issue #86.

# Test target for CI/CD - builds dist/ for the production stage to copy from.
FROM node:25 AS test

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tsc

# Drop privileges before running tests so file artifacts are owned by node.
RUN chown -R node:node /usr/src/app
USER node

CMD ["npm", "test"]

# Production target.
FROM node:25 AS production

WORKDIR /usr/src/app

# Install Google Cloud CLI (includes `bq`) for cost monitoring.
# Coolify runtime logs previously showed: `bq: not found`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends google-cloud-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Create writable runtime directories owned by the non-root user.
RUN mkdir -p data logs welcome_images temp \
  && chown -R node:node /usr/src/app

COPY --chown=node:node package*.json ./
RUN npm install --only=production

# Copy compiled files from test stage.
COPY --from=test --chown=node:node /usr/src/app/dist ./dist

# Copy essential runtime files.
COPY --chown=node:node version.txt ./

# Drop privileges. Process and any files it writes will be owned by `node`.
USER node

EXPOSE 3000

CMD ["node", "dist/bot.js"]
