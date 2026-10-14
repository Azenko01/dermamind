/**
 * Writes the OpenAPI document to packages/api-client/openapi.json without starting the server or
 * touching the database. Run: pnpm --filter @dermamind/api openapi
 */
import './openapi-env'; // must stay first: sets dummy env before AppModule is loaded
import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { buildOpenApi, setupApp } from './setup';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  setupApp(app);
  const out = resolve(__dirname, '../../../packages/api-client/openapi.json');
  writeFileSync(out, JSON.stringify(buildOpenApi(app), null, 2) + '\n');
  await app.close();
  console.log(`OpenAPI written to ${out}`);
}

void main();
