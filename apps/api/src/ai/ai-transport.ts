import Anthropic from '@anthropic-ai/sdk';
import type { AppEnv } from '../config';

/**
 * The one place that talks to the Claude API. Kept behind an injection token so tests replace it
 * with a mock — no real API calls in tests or CI.
 */
export type AiRequest = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export type AiResponse = Anthropic.Beta.Messages.BetaMessage;

export interface AiTransport {
  create(params: AiRequest): Promise<AiResponse>;
}

export const AI_TRANSPORT = Symbol('AI_TRANSPORT');

/** null when no ANTHROPIC_API_KEY is set — callers then use the fallback texts. */
export function createAiTransport(
  env: Pick<AppEnv, 'anthropicApiKey' | 'aiTimeoutMs'>,
): AiTransport | null {
  if (!env.anthropicApiKey) return null;
  // Retries are ours (one per call, PLAN.md 5.1), so the SDK doesn't add its own on top.
  const client = new Anthropic({
    apiKey: env.anthropicApiKey,
    timeout: env.aiTimeoutMs,
    maxRetries: 0,
  });
  return { create: (params) => client.beta.messages.create(params) };
}
