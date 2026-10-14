import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { CatalogService } from '../catalog/catalog.service';
import type { AppEnv } from '../config';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { runTool, type ToolCall } from './ai-runner';
import { AI_TRANSPORT, type AiTransport } from './ai-transport';
import type { AiTextDto } from './ai.dto';
import { fallbackText, type FallbackReason } from './fallback-texts';
import { PROMPT_VERSION, systemPrompt, type Lang } from './prompts/common';
import {
  INGREDIENT_TOOL,
  ingredientOutput,
  ingredientUserMessage,
  type IngredientPromptInput,
} from './prompts/ingredient-explain';
import { PARSE_TOOL, parseOutput, parseUserMessage } from './prompts/parse-inci';
import {
  PRODUCT_TOOL,
  productOutput,
  productUserMessage,
  type ProductPromptInput,
} from './prompts/product-summary';

type Kind = 'ingredient_explain' | 'product_summary' | 'parse_inci';
const BARRIER = { 1: 'good', 2: 'weakened', 3: 'compromised' } as const;

/**
 * Module `ai` (PLAN.md 2.1, 5). AI only explains: every number comes from @dermamind/scoring.
 * Order for every call: ai_cache → (no key? fallback) → daily limit → Claude → validated answer
 * or fallback text.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly catalog: CatalogService,
    private readonly scoring: ScoringService,
    @Inject(AI_TRANSPORT) private readonly transport: AiTransport | null,
  ) {}

  get available(): boolean {
    return this.transport !== null;
  }

  /** ai-ingredient-explain — no user data in the prompt, so the cache is shared by everybody. */
  async explainIngredient(id: number, userId: string, lang: Lang): Promise<AiTextDto> {
    const i = await this.prisma.ingredient.findUnique({
      where: { id },
      include: { effects: { include: { concern: true } } },
    });
    if (!i) throw new NotFoundException('Ingredient not found');
    const flagNames = {
      isFragrance: 'fragrance',
      isAlcoholDrying: 'drying alcohol',
      isFungalAcneTrigger: 'may trigger fungal acne',
      isEuAllergen: 'EU fragrance allergen',
      isParaben: 'paraben',
      isSulfate: 'sulfate',
      isSilicone: 'silicone',
      isOil: 'oil',
      isAnimalDerived: 'animal-derived',
      isReefHarmful: 'may harm coral reefs',
    } as const;
    const input: IngredientPromptInput = {
      inciName: i.inciName,
      displayName: i.displayName,
      functions: i.functions,
      flags: (Object.keys(flagNames) as (keyof typeof flagNames)[])
        .filter((f) => i[f])
        .map((f) => flagNames[f]),
      comedogenic: i.comedogenic,
      irritationRisk: i.irritationRisk,
      effects: i.effects.map((e) => ({ concern: e.concern.code, effect: e.effect })),
    };

    const result = await this.generate(
      'ingredient_explain',
      userId,
      lang,
      input,
      (model) => ({
        model,
        system: systemPrompt(lang),
        user: ingredientUserMessage(input),
        tool: INGREDIENT_TOOL,
        schema: ingredientOutput,
        maxTokens: 4000,
      }),
      this.config.get('aiModelFast', { infer: true }),
    );
    if (!result.ok) return this.fallback('ingredient', result.reason, lang);
    return {
      text: result.value.summary,
      caution: result.value.caution || null,
      source: result.source,
      fallbackReason: null,
      promptVersion: PROMPT_VERSION,
    };
  }

  /**
   * ai-product-summary — "Dlaczego taki wynik". The prompt carries the rule-based result and the
   * skin profile only (type, sensitivity, barrier, concerns, avoided groups) — no e-mail, name or id.
   */
  async productSummary(productId: number, userId: string, lang: Lang): Promise<AiTextDto> {
    const [detail, profile] = await Promise.all([
      this.catalog.get(productId, userId),
      this.scoring.profileFor(userId),
    ]);
    if (!detail.match || !profile)
      throw new ConflictException('A skin profile is needed for this text');
    const m = detail.match;
    const input: ProductPromptInput = {
      product: { brand: detail.brand, name: detail.name, category: detail.category },
      result: {
        score: m.score,
        label: m.label,
        status: m.status,
        lowConfidence: m.lowConfidence,
        onlyKeyIngredientsKnown: !detail.inciComplete,
        helps: m.pros.map((p) => ({ ingredient: p.ingredient, concern: p.concern })),
        lowers: m.cons.map((c) => ({
          ingredient: c.ingredient,
          reason: c.reason,
          ...(c.concern ? { concern: c.concern } : {}),
        })),
        excluded: m.excludedBy.map((e) => ({
          ingredient: e.ingredient,
          ...(e.group ? { group: e.group } : {}),
        })),
      },
      skin: {
        type: profile.skinType,
        sensitive: profile.isSensitive,
        barrier: profile.barrierLevel ? (BARRIER[profile.barrierLevel as 1 | 2 | 3] ?? null) : null,
        concerns: [...profile.concerns].sort((a, b) => a.priority - b.priority).map((c) => c.code),
        avoidGroups: [...profile.avoidedGroups].sort(),
      },
    };

    const result = await this.generate(
      'product_summary',
      userId,
      lang,
      input,
      (model) => ({
        model,
        system: systemPrompt(lang),
        user: productUserMessage(input),
        tool: PRODUCT_TOOL,
        schema: productOutput,
        maxTokens: 4000,
      }),
      this.config.get('aiModelSmart', { infer: true }),
    );
    if (!result.ok) return this.fallback('product', result.reason, lang);
    return {
      text: result.value.summary,
      caution: null,
      source: result.source,
      fallbackReason: null,
      promptVersion: PROMPT_VERSION,
    };
  }

  /** ai-parse-inci — names only; null when AI isn't available or can't help. */
  async parseInci(text: string, userId: string): Promise<string[] | null> {
    const result = await this.generate(
      'parse_inci',
      userId,
      'pl',
      { text },
      (model) => ({
        model,
        system: systemPrompt('en'),
        user: parseUserMessage(text),
        tool: PARSE_TOOL,
        schema: parseOutput,
        maxTokens: 16000,
      }),
      this.config.get('aiModelFast', { infer: true }),
    );
    return result.ok && result.value.ingredients.length ? result.value.ingredients : null;
  }

  // ─── shared pipeline ───

  private async generate<T>(
    kind: Kind,
    userId: string,
    lang: Lang,
    input: unknown,
    build: (model: string) => ToolCall<T>,
    model: string,
  ): Promise<
    { ok: true; value: T; source: 'ai' | 'cache' } | { ok: false; reason: FallbackReason }
  > {
    const key = cacheKey(kind, lang, model, input);
    const cached = await this.prisma.aiCache.findUnique({ where: { key } });
    if (cached) return { ok: true, value: cached.content as T, source: 'cache' };

    if (!this.transport) return { ok: false, reason: 'not_configured' };
    if (!(await this.reserveCall(userId))) return { ok: false, reason: 'limit' };

    const result = await runTool(this.transport, build(model), kind);
    if (!result.ok) return result;
    await this.prisma.aiCache.upsert({
      where: { key },
      create: {
        key,
        kind,
        locale: lang,
        model: result.model,
        content: result.value as Prisma.InputJsonValue,
      },
      update: {},
    });
    return { ok: true, value: result.value, source: 'ai' };
  }

  /** Atomically counts one call for today (Europe/Warsaw); false when the daily limit is reached. */
  private async reserveCall(userId: string): Promise<boolean> {
    const limit = this.config.get('aiDailyLimit', { infer: true });
    const rows = await this.prisma.$queryRaw<{ calls: number }[]>`
      INSERT INTO ai_usage (user_id, day, calls)
      VALUES (${userId}::uuid, (now() AT TIME ZONE 'Europe/Warsaw')::date, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET calls = ai_usage.calls + 1
      WHERE ai_usage.calls < ${limit}
      RETURNING calls`;
    return rows.length > 0 && limit > 0;
  }

  private fallback(kind: 'ingredient' | 'product', reason: FallbackReason, lang: Lang): AiTextDto {
    return {
      text: fallbackText(kind, reason, lang),
      caution: null,
      source: 'fallback',
      fallbackReason: reason,
      promptVersion: PROMPT_VERSION,
    };
  }
}

/** hash(prompt version + kind + language + model + exact prompt input) — PLAN.md 3.3 ai_cache. */
function cacheKey(kind: Kind, lang: Lang, model: string, input: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify([PROMPT_VERSION, kind, lang, model, input]))
    .digest('hex');
}
