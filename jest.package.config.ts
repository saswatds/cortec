import type { Config } from 'jest';

const config: Config = {
  verbose: false,
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['dist/'],
  testMatch: ['**/tests/**/*.test.ts'],
};

export default config;
