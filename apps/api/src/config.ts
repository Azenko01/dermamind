/** Typed access to environment variables. Secrets are read here and nowhere else. */
export interface AppEnv {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  /** Access token lifetime (PLAN.md 2: 15 min). */
  accessTtlSec: number;
  /** Refresh token lifetime (PLAN.md 2: 30 days). */
  refreshTtlDays: number;
  /** Requests per minute per IP on /auth endpoints. */
  authRateLimit: number;
  minAppVersion: string;
  latestAppVersion: string;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters (see apps/api/.env.example)',
    );
  }
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl,
    jwtSecret,
    accessTtlSec: 15 * 60,
    refreshTtlDays: 30,
    authRateLimit: Number(env.AUTH_RATE_LIMIT ?? 20),
    minAppVersion: env.MIN_APP_VERSION ?? '0.1.0',
    latestAppVersion: env.LATEST_APP_VERSION ?? env.MIN_APP_VERSION ?? '0.1.0',
  };
}
