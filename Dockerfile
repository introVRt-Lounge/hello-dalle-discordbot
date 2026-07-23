# Multi-stage Dockerfile for hello-dalle-discordbot.
#
# Stages:
#   deps       -> install ALL deps (incl. dev) from package-lock.json
#   build      -> compile TypeScript -> dist/
#   test       -> CI target; runs jest against the build
#   prod-deps  -> install only production deps
#   runtime    -> minimal slim runtime image; non-root, healthcheck
#
# Base: Node 22 LTS on Debian Bookworm slim (supported until 2027-04).
# Use `npm ci` everywhere so builds are deterministic from package-lock.json.

ARG NODE_IMAGE=node:22-bookworm-slim

# ---------- deps ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /usr/src/app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --include=dev

# ---------- build ----------
FROM deps AS build
WORKDIR /usr/src/app
COPY --chown=node:node tsconfig.json tsconfig.check.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node setupTests.ts jest.config.ts ./
RUN npx tsc \
  && chown -R node:node /usr/src/app

# ---------- test (CI target) ----------
FROM build AS test
WORKDIR /usr/src/app
COPY --chown=node:node version.txt ./
USER node
CMD ["npm", "test"]

# ---------- prod-deps ----------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /usr/src/app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- runtime (default target) ----------
FROM ${NODE_IMAGE} AS production
WORKDIR /usr/src/app

# Install Google Cloud CLI (includes `bq`) for cost monitoring,
# plus procps for the healthcheck. Pin nothing here because base
# is bookworm-slim and apt is the canonical source.
# hadolint ignore=DL3008,DL3009
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       ca-certificates \
       curl \
       gnupg \
       gosu \
       procps \
  && mkdir -p /etc/apt/keyrings \
  && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
       | gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
       > /etc/apt/sources.list.d/google-cloud-sdk.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends google-cloud-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Pre-create writable runtime directories owned by the non-root user.
# NOTE: this only affects image layers. Existing named volumes keep their
# host ownership — docker/docker-entrypoint.sh repairs that at start (#132).
RUN mkdir -p data logs welcome_images temp profile_images \
  && chown -R node:node /usr/src/app

COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node package.json package-lock.json version.txt ./
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

# Image default user is node (OWASP / Semgrep last-user-is-root).
# Coolify compose MUST set `user: "0:0"` so the entrypoint can chown
# pre-existing named volumes, then gosu drops to node for the long-running process (#132).
USER node

EXPOSE 3000

# Healthcheck: process must be alive. (No HTTP /healthz endpoint yet -
# upgrade to a real liveness probe when the bot exposes one.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pidof node >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/bot.js"]
