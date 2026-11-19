import { createWriteStream, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

export const USER_AGENT = 'DermaMind/1.0 (diploma project)';

/** Downloads `url` to `path` unless it is there already (or `refresh`); atomic via a .part file. */
export async function download(url: string, path: string, refresh = false): Promise<boolean> {
  if (existsSync(path) && !refresh) return false;
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
  await pipeline(
    Readable.fromWeb(res.body as WebReadableStream),
    createWriteStream(`${path}.part`),
  );
  renameSync(`${path}.part`, path);
  return true;
}

export function loadDatabaseUrl(root: string): string {
  const envFile = `${root}/apps/api/.env`;
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return process.env.DATABASE_URL;
}
