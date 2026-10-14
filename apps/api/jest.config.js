/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
