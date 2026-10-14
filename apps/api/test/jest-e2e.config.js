/** E2E tests against a real Postgres (TEST_DATABASE_URL, default: dermamind_test on localhost). */
const base = require('../jest.config.js');

module.exports = {
  ...base,
  rootDir: '..',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  setupFiles: ['<rootDir>/test/env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  maxWorkers: 1,
};
