import type { Config } from 'jest';

const config: Config = {
  verbose: false,
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['dist/'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};

export default config;
