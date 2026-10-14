// Runs before every e2e test file: point the app at the throwaway test database.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://dermamind:dermamind@localhost:5432/dermamind_test?schema=public';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = 'e2e-secret-that-is-at-least-32-characters-long';
process.env.AUTH_RATE_LIMIT = '10000';
// Never call the real Claude API from tests, even if a key is in apps/api/.env.
process.env.ANTHROPIC_API_KEY = '';
process.env.AI_MODEL_FAST = 'test-fast-model';
process.env.AI_MODEL_SMART = 'test-smart-model';
process.env.AI_DAILY_LIMIT = '30';
