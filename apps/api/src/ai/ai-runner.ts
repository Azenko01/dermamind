import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import type { z } from 'zod';
import type { AiRequest, AiTransport } from './ai-transport';

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`). */
const SERVER_FALLBACK_MODELS = new Set([
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-1',
]);

export interface ToolCall<T> {
  model: string;
  system: string;
  user: string;
  tool: Anthropic.Beta.Messages.BetaTool;
  schema: z.ZodType<T>;
  maxTokens: number;
}

export type ToolResult<T> =
  { ok: true; value: T; model: string } | { ok: false; reason: 'error' | 'refused' };

const logger = new Logger('AiRunner');

/**
 * Structured output through one strict tool (PLAN.md 5.1). Forced tool_choice is rejected by the
 * newest models, so the tool is offered with "auto" and the prompt asks for it; the answer is
 * validated with Zod. One retry for a missing/invalid tool call or a transient API error, then the
 * caller shows its fallback text. Logs never contain prompts, answers or the key.
 */
export async function runTool<T>(
  transport: AiTransport,
  call: ToolCall<T>,
  label: string,
): Promise<ToolResult<T>> {
  const params: AiRequest = {
    model: call.model,
    max_tokens: call.maxTokens,
    system: call.system,
    messages: [{ role: 'user', content: call.user }],
    tools: [call.tool],
    tool_choice: { type: 'auto' },
    output_config: { effort: 'low' },
    ...(SERVER_FALLBACK_MODELS.has(call.model)
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {}),
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await transport.create(params);
      if (res.stop_reason === 'refusal') {
        logger.warn(`${label}: refused (${res.stop_details?.category ?? 'no category'})`);
        return { ok: false, reason: 'refused' };
      }
      const block = res.content.find((b) => b.type === 'tool_use' && b.name === call.tool.name);
      const parsed = block && block.type === 'tool_use' ? call.schema.safeParse(block.input) : null;
      if (parsed?.success) return { ok: true, value: parsed.data, model: res.model };
      logger.warn(
        `${label}: invalid answer on attempt ${attempt} (stop_reason ${res.stop_reason})`,
      );
    } catch (err) {
      const retryable =
        err instanceof Anthropic.APIConnectionError ||
        err instanceof Anthropic.RateLimitError ||
        err instanceof Anthropic.InternalServerError ||
        (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500);
      // API error bodies carry the reason ("credit balance is too low", "model not found") and no
      // secrets — log them so the cause is visible in the server log; prompts/answers never are.
      const api = err instanceof Anthropic.APIError ? err : null;
      const body = api?.error as { error?: { type?: string; message?: string } } | undefined;
      logger.warn(
        `${label}: ${(err as Error).constructor.name}${api?.status ? ` ${api.status}` : ''}` +
          `${body?.error?.type ? ` ${body.error.type}` : ''}${body?.error?.message ? ` "${body.error.message}"` : ''}` +
          `${api?.requestID ? ` request-id=${api.requestID}` : ''} on attempt ${attempt}`,
      );
      if (!retryable) return { ok: false, reason: 'error' };
    }
  }
  return { ok: false, reason: 'error' };
}
