import {
  computeRoutineScore,
  findConflicts,
  pickRoutine,
  STEP_CATEGORIES,
  STEPS_BY_TIME,
  TIMES_OF_DAY,
  type ConflictRule,
  type RoutineProduct,
  type RoutineSlot,
  type RoutineStep,
  type TimeOfDay,
} from '@dermamind/scoring';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import type { RoutinePromptInput } from '../ai/prompts/routine';
import { toListItem } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableProductInclude,
  type ScorableProduct,
  type ScoringProfile,
} from '../scoring/scoring.service';
import type {
  GenerateResultDto,
  PutRoutinesDto,
  RoutineConflictDto,
  RoutineDto,
  RoutinesDto,
} from './routines.dto';

/** Fixed texts — from the app, never from the model (PLAN.md 5.1). */
export const ROUTINE_DISCLAIMER =
  'Rutyna ma charakter informacyjny i nie zastępuje porady specjalisty. Jeśli masz problemy skórne, skonsultuj się z dermatologiem.';
export const RULES_SUMMARY =
  'Ułożyliśmy rutynę z najlepiej dopasowanych do Twojej skóry produktów z naszej bazy — po jednym na każdy krok i bez konfliktów składników tam, gdzie to możliwe. Nakładaj je w kolejności kroków, od najlżejszej konsystencji do najcięższej, a rano zakończ filtrem SPF.';

const MIN_CANDIDATE_SCORE = 50;
const CANDIDATES_PER_STEP = 3;
const BARRIER = { 1: 'good', 2: 'weakened', 3: 'compromised' } as const;

type Loaded = { time: TimeOfDay; step: RoutineStep; product: ScorableProduct | null };

/** Rutyna T3 (PLAN.md 4, 5.2, 6.5 flow 3). */
@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly ai: AiService,
  ) {}

  async get(userId: string): Promise<RoutinesDto> {
    const [routines, profile, rules] = await Promise.all([
      this.prisma.routine.findMany({
        where: { userId },
        include: { items: { include: { product: { include: scorableProductInclude } } } },
      }),
      this.scoring.profileFor(userId),
      this.rules(),
    ]);

    const loaded: Loaded[] = TIMES_OF_DAY.flatMap((time) => {
      const routine = routines.find((r) => r.timeOfDay === time);
      return STEPS_BY_TIME[time].map((step) => {
        const item = routine?.items.find((i) => i.step === step);
        const product = item?.product && item.product.isPublished ? item.product : null;
        return { time, step, product };
      });
    });
    const matches = new Map(
      loaded.flatMap((l) =>
        l.product && profile
          ? [[l.product.id, this.scoring.score(profile, l.product)] as const]
          : [],
      ),
    );
    const slots = loaded.map((l) => toSlot(l, matches.get(l.product?.id ?? -1)?.score ?? 0));
    const names = new Map(
      loaded.flatMap((l) => (l.product ? [[l.product.id, l.product.name] as const] : [])),
    );

    const routineScore = profile
      ? computeRoutineScore(slots, rules)
      : {
          score: null,
          averageProductScore: null,
          missingSpf: false,
          productCount: 0,
          conflicts: findConflicts(slots, rules),
        };

    const routineDto = (time: TimeOfDay): RoutineDto => {
      const routine = routines.find((r) => r.timeOfDay === time);
      return {
        time,
        generatedBy: (routine?.generatedBy as 'ai' | 'rules' | null) ?? null,
        summary: routine?.aiSummary ?? null,
        steps: loaded
          .filter((l) => l.time === time)
          .map((l, i) => ({
            position: i + 1,
            step: l.step,
            product: l.product ? toListItem(l.product, matches.get(l.product.id) ?? null) : null,
          })),
      };
    };

    return {
      am: routineDto('am'),
      pm: routineDto('pm'),
      score: {
        score: routineScore.score,
        averageProductScore: routineScore.averageProductScore,
        missingSpf: routineScore.missingSpf,
        productCount: routineScore.productCount,
        conflicts: routineScore.conflicts.map((c): RoutineConflictDto => ({
          ...c,
          a: { ...c.a, productName: names.get(c.a.productId) ?? '' },
          b: { ...c.b, productName: names.get(c.b.productId) ?? '' },
        })),
      },
      disclaimer: ROUTINE_DISCLAIMER,
    };
  }

  /** Replaces both routines. A manual change clears the "generated" mark and its summary. */
  async put(userId: string, dto: PutRoutinesDto): Promise<RoutinesDto> {
    const wanted = new Map<TimeOfDay, Map<RoutineStep, number>>();
    const productIds = new Set<number>();
    for (const time of TIMES_OF_DAY) {
      const steps = new Map<RoutineStep, number>();
      for (const s of dto[time]) {
        if (!STEPS_BY_TIME[time].includes(s.step)) {
          throw new BadRequestException(`Step "${s.step}" is not part of the ${time} routine`);
        }
        if (steps.has(s.step))
          throw new BadRequestException(`Step "${s.step}" appears twice in ${time}`);
        if (s.productId) {
          steps.set(s.step, s.productId);
          productIds.add(s.productId);
        }
      }
      wanted.set(time, steps);
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...productIds] }, isPublished: true },
      select: { id: true, category: true },
    });
    const category = new Map(products.map((p) => [p.id, p.category as string]));
    for (const [time, steps] of wanted) {
      for (const [step, productId] of steps) {
        const c = category.get(productId);
        if (!c) throw new BadRequestException(`Unknown product ${productId}`);
        if (!STEP_CATEGORIES[step].includes(c)) {
          throw new BadRequestException(`A ${c} product does not fit the "${step}" step (${time})`);
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const time of TIMES_OF_DAY) {
        const steps = wanted.get(time)!;
        const existing = await tx.routine.findUnique({
          where: { userId_timeOfDay: { userId, timeOfDay: time } },
          include: { items: true },
        });
        const same =
          existing &&
          existing.items.length === steps.size &&
          existing.items.every((i) => steps.get(i.step as RoutineStep) === i.productId);
        if (same) continue;
        const routine = await tx.routine.upsert({
          where: { userId_timeOfDay: { userId, timeOfDay: time } },
          create: { userId, timeOfDay: time },
          update: { generatedBy: null, aiSummary: null },
        });
        await this.writeItems(tx, routine.id, time, steps);
      }
    });
    return this.get(userId);
  }

  /**
   * PLAN.md 5.2: candidates by rules (category, no exclusions, score ≥ 50, top 3 per step) →
   * ai-routine picks and explains → the pick is checked by rules (ids among candidates, one product
   * per step, no conflicts) → otherwise the rule-based pick and a fixed text.
   */
  async generate(userId: string, times: TimeOfDay[] = ['am', 'pm']): Promise<GenerateResultDto> {
    const [profile, rules] = await Promise.all([this.scoring.profileFor(userId), this.rules()]);
    if (!profile) throw new ConflictException('A skin profile is needed to build a routine');

    const categories = [...new Set(Object.values(STEP_CATEGORIES).flat())];
    const products = await this.prisma.product.findMany({
      where: { isPublished: true, category: { in: categories as never[] } },
      include: scorableProductInclude,
    });
    const scored = products
      .map((p) => ({ p, m: this.scoring.score(profile, p) }))
      .filter(({ m }) => m.status === 'ok' && m.score >= MIN_CANDIDATE_SCORE);

    const candidates = times.flatMap((time) =>
      STEPS_BY_TIME[time].map((step) => ({
        time,
        step,
        products: scored
          .filter(({ p }) => STEP_CATEGORIES[step].includes(p.category))
          .sort((a, b) => b.m.score - a.m.score || a.p.name.localeCompare(b.p.name, 'pl'))
          .slice(0, CANDIDATES_PER_STEP)
          .map(({ p, m }) => ({ product: p, match: m, routine: toRoutineProduct(p, m.score) })),
      })),
    );
    const emptySteps = candidates
      .filter((c) => c.products.length === 0)
      .map((c) => `${c.time}:${c.step}`);
    const rulePick = pickRoutine(
      candidates.map((c) => ({
        time: c.time,
        step: c.step,
        products: c.products.map((x) => x.routine),
      })),
      rules,
    );

    let picked: RoutineSlot[] = rulePick;
    let generatedBy: 'ai' | 'rules' = 'rules';
    let summary = RULES_SUMMARY;
    let fallbackReason: GenerateResultDto['fallbackReason'] = null;

    if (this.ai.available && candidates.some((c) => c.products.length)) {
      const ai = await this.ai.generateRoutine(
        userId,
        this.promptInput(profile, candidates, rules),
        'pl',
      );
      if (ai.ok) {
        const fromAi = this.checkAiPick(ai.value, candidates, rules);
        if (fromAi) {
          picked = fromAi;
          generatedBy = 'ai';
          summary = ai.value.summary;
        } else fallbackReason = 'invalid_pick';
      } else fallbackReason = ai.reason;
    } else if (!this.ai.available) fallbackReason = 'not_configured';

    await this.prisma.$transaction(async (tx) => {
      for (const time of times) {
        const routine = await tx.routine.upsert({
          where: { userId_timeOfDay: { userId, timeOfDay: time } },
          create: { userId, timeOfDay: time, generatedBy, aiSummary: summary },
          update: { generatedBy, aiSummary: summary },
        });
        const steps = new Map<RoutineStep, number>();
        for (const s of picked)
          if (s.time === time && s.product) steps.set(s.step, s.product.productId);
        await this.writeItems(tx, routine.id, time, steps);
      }
    });

    return { ...(await this.get(userId)), generatedBy, fallbackReason, emptySteps };
  }

  /** null when the model's pick breaks a rule — then the rule-based pick is used (PLAN.md 5.2 step 3). */
  private checkAiPick(
    ai: {
      am: { step: RoutineStep; productId: number }[];
      pm: { step: RoutineStep; productId: number }[];
    },
    candidates: { time: TimeOfDay; step: RoutineStep; products: { routine: RoutineProduct }[] }[],
    rules: ConflictRule[],
  ): RoutineSlot[] | null {
    const slots: RoutineSlot[] = [];
    for (const c of candidates) {
      const picks = ai[c.time].filter((p) => p.step === c.step);
      if (c.products.length === 0) {
        if (picks.length) return null;
        slots.push({ time: c.time, step: c.step, product: null });
        continue;
      }
      if (picks.length !== 1) return null;
      const product = c.products.find((x) => x.routine.productId === picks[0]!.productId)?.routine;
      if (!product) return null;
      slots.push({ time: c.time, step: c.step, product });
    }
    for (const time of TIMES_OF_DAY) {
      const ids = slots
        .filter((s) => s.time === time && s.product)
        .map((s) => s.product!.productId);
      if (new Set(ids).size !== ids.length) return null;
    }
    // steps the model returned for a time of day we didn't ask about are ignored
    return findConflicts(slots, rules).length === 0 ? slots : null;
  }

  /** Skin data and candidates only — no e-mail, name or id (PLAN.md 5.1). */
  private promptInput(
    profile: ScoringProfile,
    candidates: {
      time: TimeOfDay;
      step: RoutineStep;
      products: { product: ScorableProduct; match: ReturnType<ScoringService['score']> }[];
    }[],
    rules: ConflictRule[],
  ): RoutinePromptInput {
    const ingredientName = new Map<number, string>();
    for (const c of candidates) {
      for (const { product } of c.products) {
        for (const pi of product.ingredients)
          ingredientName.set(pi.ingredient.id, pi.ingredient.displayName);
      }
    }
    return {
      skin: {
        type: profile.skinType,
        sensitive: profile.isSensitive,
        barrier: profile.barrierLevel ? (BARRIER[profile.barrierLevel as 1 | 2 | 3] ?? null) : null,
        concerns: [...profile.concerns].sort((a, b) => a.priority - b.priority).map((c) => c.code),
        avoidGroups: [...profile.avoidedGroups].sort(),
      },
      candidates: candidates
        .filter((c) => c.products.length)
        .map((c) => ({
          time: c.time,
          step: c.step,
          products: c.products.map(({ product, match }) => ({
            productId: product.id,
            brand: product.brand?.name ?? null,
            name: product.name,
            category: product.category,
            score: match.score,
            helps: [...new Set(match.pros.map((p) => `${p.ingredient} → ${p.concern}`))].slice(
              0,
              4,
            ),
            cautions: [...new Set(match.cons.map((x) => `${x.ingredient}: ${x.reason}`))].slice(
              0,
              3,
            ),
            keyIngredients: product.ingredients.slice(0, 8).map((pi) => pi.ingredient.displayName),
          })),
        })),
      // only pairs that actually occur among the candidates
      conflictPairs: rules
        .filter((r) => ingredientName.has(r.aId) && ingredientName.has(r.bId))
        .map((r) => ({
          a: ingredientName.get(r.aId)!,
          b: ingredientName.get(r.bId)!,
          reason: r.noteKey,
        })),
    };
  }

  private async rules(): Promise<ConflictRule[]> {
    return this.prisma.ingredientConflict.findMany({
      select: { aId: true, bId: true, severity: true, noteKey: true },
    });
  }

  private async writeItems(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    routineId: number,
    time: TimeOfDay,
    steps: Map<RoutineStep, number>,
  ): Promise<void> {
    await tx.routineItem.deleteMany({ where: { routineId } });
    await tx.routineItem.createMany({
      data: STEPS_BY_TIME[time].flatMap((step, i) => {
        const productId = steps.get(step);
        return productId ? [{ routineId, step, productId, position: i + 1 }] : [];
      }),
    });
  }
}

function toRoutineProduct(p: ScorableProduct, score: number): RoutineProduct {
  return {
    productId: p.id,
    category: p.category,
    score,
    ingredients: p.ingredients.map((pi) => ({
      id: pi.ingredient.id,
      name: pi.ingredient.displayName,
      position: pi.position,
    })),
  };
}

function toSlot(l: Loaded, score: number): RoutineSlot {
  return {
    time: l.time,
    step: l.step,
    product: l.product ? toRoutineProduct(l.product, score) : null,
  };
}
