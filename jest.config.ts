import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setupTests.ts'],  // add env and others
  roots: ['<rootDir>/src'], // If tests are only inside src, keep it this way
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'], // Flexible pattern for test file names
  moduleDirectories: ['node_modules', 'src'], 
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'], // Ensure dist is ignored
};

export default config;
