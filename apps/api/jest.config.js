// Unit tests (src/**/*.spec.ts), no database. DB-backed tests: test/jest-e2e.config.js.
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Use the scoring sources directly, no build step needed for tests.
    '^@dermamind/scoring$': '<rootDir>/../../packages/scoring/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
