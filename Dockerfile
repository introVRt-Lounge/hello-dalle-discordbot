# Use the official Node.js image with version 20
FROM node:20

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

# Run the web service on container startup
CMD ["node", "dist/bot.js"]
