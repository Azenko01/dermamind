// Runs before every e2e test file: point the app at the throwaway test database.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://dermamind:dermamind@localhost:5432/dermamind_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'e2e-secret-that-is-at-least-32-characters-long';
process.env.AUTH_RATE_LIMIT = '10000';
