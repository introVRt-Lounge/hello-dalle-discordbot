import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',              // Use ts-jest preset for TypeScript support
  testEnvironment: 'node',        // Set the test environment to Node.js
  roots: ['<rootDir>/src'],       // Define the root directory for the tests
  testMatch: ['**/tests/**/*.ts'],// Look for test files in the src/tests directory
  moduleDirectories: ['node_modules', 'src'], // Resolve modules from node_modules and src
  transform: {
    '^.+\\.ts$': 'ts-jest'        // Transform TypeScript files using ts-jest
  }
};

export default config;
