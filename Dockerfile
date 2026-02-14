# Use the official Node.js image with version 20
FROM node:25

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript files (if this step is needed in your setup)
RUN npx tsc

# Test target for CI/CD
FROM node:25 as test

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx tsc

CMD ["npm", "test"]

# Production target
FROM node:25 as production

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

# Create necessary directories
RUN mkdir -p data logs

COPY package*.json ./
RUN npm install --only=production

# Copy compiled files from test stage
COPY --from=test /usr/src/app/dist ./dist

# Copy essential runtime files
COPY version.txt ./

# Ensure proper permissions
RUN chmod -R 755 /usr/src/app

# Expose port for health checks (if needed)
EXPOSE 3000

# Run the web service on container startup
CMD ["node", "dist/bot.js"]
