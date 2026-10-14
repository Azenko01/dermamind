/**
 * Claude API diagnostics: one minimal call per model, with the same config and transport as the
 * API's ai module. Prints error types and statuses — never the key.
 *
 *   pnpm ai:check
 */
import Anthropic from '@anthropic-ai/sdk';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAiTransport } from '../apps/api/src/ai/ai-transport';
import { loadEnv } from '../apps/api/src/config';

const envFile = resolve(__dirname, '../apps/api/.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

/** Only the kind and length — the key itself is never printed. */
function describeKey(key: string | null): string {
  if (!key) return 'NOT SET';
  const kind = /^sk-ant-admin\d\d-/.test(key)
    ? 'admin key (cannot call /v1/messages)'
    : /^sk-ant-oat\d\d-/.test(key)
      ? 'OAuth access token, not an API key'
      : key.startsWith('sk-ant-')
        ? 'sk-ant-… key'
        : 'does not start with sk-ant- (copied wrong?)';
  return `set — ${kind}, ${key.length} chars`;
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    const body = err.error as { error?: { type?: string; message?: string } } | undefined;
    const requestId = err.requestID ?? err.headers?.get?.('request-id') ?? '-';
    return `${err.constructor.name} status=${err.status ?? '-'} type=${body?.error?.type ?? '-'} message="${body?.error?.message ?? err.message}" request-id=${requestId}`;
  }
  return `${(err as Error).constructor.name}: ${(err as Error).message}`;
}

async function main(): Promise<void> {
  const env = loadEnv();
  console.log(`ANTHROPIC_API_KEY: ${describeKey(env.anthropicApiKey)}`);
  console.log(
    `AI_MODEL_FAST=${env.aiModelFast}  AI_MODEL_SMART=${env.aiModelSmart}  timeout=${env.aiTimeoutMs} ms`,
  );
  const transport = createAiTransport(env);
  if (!transport || !env.anthropicApiKey) {
    console.log('→ No key: the ai module answers with fallback texts.');
    return;
  }

  // 1. Do the configured model IDs exist for this key? (Models API)
  const client = new Anthropic({
    apiKey: env.anthropicApiKey,
    timeout: env.aiTimeoutMs,
    maxRetries: 0,
  });
  for (const model of [env.aiModelFast, env.aiModelSmart]) {
    try {
      const m = await client.models.retrieve(model);
      console.log(`models.retrieve(${model}): OK — ${m.display_name}`);
    } catch (err) {
      console.log(`models.retrieve(${model}): ${describeError(err)}`);
    }
  }

  // 2. One minimal message per model through the same transport as the ai module.
  for (const model of [env.aiModelFast, env.aiModelSmart]) {
    try {
      const res = await transport.create({
        model,
        max_tokens: 256,
        messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      });
      const text = res.content.find((b) => b.type === 'text');
      console.log(
        `messages.create(${model}): OK stop_reason=${res.stop_reason} served_by=${res.model} text="${text && 'text' in text ? text.text.trim().slice(0, 20) : ''}"`,
      );
    } catch (err) {
      console.log(`messages.create(${model}): ${describeError(err)}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error(describeError(err));
  process.exit(1);
});
