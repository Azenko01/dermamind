/** Typed access to environment variables. Secrets are read here and nowhere else. */
export interface AppEnv {
  port: number;
  databaseUrl: string;
  minAppVersion: string;
  latestAppVersion: string;
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (see apps/api/.env.example)');
  return {
    port: Number(env.PORT ?? 3000),
    databaseUrl,
    minAppVersion: env.MIN_APP_VERSION ?? '0.1.0',
    latestAppVersion: env.LATEST_APP_VERSION ?? env.MIN_APP_VERSION ?? '0.1.0',
  };
}
