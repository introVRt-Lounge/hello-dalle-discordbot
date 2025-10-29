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
