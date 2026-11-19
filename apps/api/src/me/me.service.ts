import {
  aliasKey,
  computeSkinProfile,
  inciLookupKeys,
  type Budget,
  type QuizAnswers,
} from '@dermamind/scoring';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Budget as DbBudget, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MeDto, UpdateMeDto } from './dto/me.dto';

// Postgres enum labels '30_70' / '70_150' aren't valid TS identifiers, so Prisma renames them.
const toDbBudget: Record<Budget, DbBudget> = {
  lt30: 'lt30',
  '30_70': 'from30to70',
  '70_150': 'from70to150',
  gt150: 'gt150',
};
const fromDbBudget = Object.fromEntries(
  Object.entries(toDbBudget).map(([api, db]) => [db, api]),
) as Record<DbBudget, Budget>;

const meInclude = {
  profile: {
    include: {
      concerns: { include: { concern: true }, orderBy: { priority: 'asc' } },
      avoidedGroups: { include: { group: true } },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithProfile = Prisma.UserGetPayload<{ include: typeof meInclude }>;

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: meInclude });
    if (!user?.profile) throw new UnauthorizedException('Account no longer exists');
    const quiz = user.profile.quizAnswers as unknown as QuizAnswers | null;
    return toMeDto(user, user.profile, await this.avoidNames(quiz?.avoidIngredients ?? []));
  }

  /**
   * Chips show a Polish name, never the raw INCI: "ALCOHOL DENAT." → "Alkohol denaturowany".
   * Names the dictionary doesn't know (yet) are shown as typed, in title case.
   */
  private async avoidNames(names: string[]): Promise<MeDto['profile']['avoidIngredientNames']> {
    if (!names.length) return [];
    const [direct, aliases] = await Promise.all([
      this.prisma.ingredient.findMany({
        where: { inciName: { in: names } },
        select: { id: true, inciName: true, displayName: true, namePl: true },
      }),
      this.prisma.ingredientAlias.findMany({
        where: { alias: { in: names.flatMap(inciLookupKeys) } },
        select: {
          alias: true,
          ingredient: { select: { id: true, inciName: true, displayName: true, namePl: true } },
        },
      }),
    ]);
    const byInci = new Map(direct.map((i) => [i.inciName, i]));
    const byAlias = new Map(aliases.map((a) => [a.alias, a.ingredient]));
    return names.map((inci) => {
      const hit =
        byInci.get(inci) ??
        inciLookupKeys(inci)
          .map((k) => byAlias.get(k))
          .find((x) => x !== undefined);
      return {
        inci,
        name: hit ? (hit.namePl ?? hit.displayName) : titleCase(inci),
        ingredientId: hit?.id ?? null,
      };
    });
  }

  /**
   * Stores raw answers and everything derived from them in one transaction: skin profile columns,
   * concerns (priority = order of choice), avoided groups and avoided ingredients that exist in the
   * catalogue. Unknown INCI names stay in quiz_answers and can be matched after the next import.
   */
  async saveQuiz(userId: string, answers: QuizAnswers): Promise<MeDto> {
    const skin = computeSkinProfile(answers);

    await this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({ where: { userId }, select: { userId: true } });
      if (!profile) throw new UnauthorizedException('Account no longer exists');

      const [concerns, groups, ingredients] = await Promise.all([
        tx.skinConcern.findMany({ where: { code: { in: answers.concerns } } }),
        tx.ingredientGroup.findMany({ where: { code: { in: answers.avoidGroups } } }),
        answers.avoidIngredients.length
          ? tx.ingredient.findMany({
              where: {
                OR: [
                  { inciName: { in: answers.avoidIngredients } },
                  { aliases: { some: { alias: { in: answers.avoidIngredients.map(aliasKey) } } } },
                ],
              },
              select: { id: true },
            })
          : [],
      ]);
      const concernId = new Map(concerns.map((c) => [c.code, c.id]));

      await tx.profile.update({
        where: { userId },
        data: {
          skinType: skin.skinType,
          oilLevel: skin.oilLevel,
          barrierLevel: skin.barrierLevel,
          sensitivityLevel: skin.sensitivityLevel,
          isSensitive: skin.isSensitive,
          mustHaves: answers.mustHaves,
          usesSpf: answers.usesSpf,
          budget: toDbBudget[answers.budget],
          quizAnswers: answers as unknown as Prisma.InputJsonValue,
          onboardedAt: new Date(),
          concerns: {
            deleteMany: {},
            create: answers.concerns.flatMap((code, i) => {
              const id = concernId.get(code);
              return id === undefined ? [] : [{ concernId: id, priority: i + 1 }];
            }),
          },
          avoidedGroups: { deleteMany: {}, create: groups.map((g) => ({ groupId: g.id })) },
          avoidedIngredients: {
            deleteMany: {},
            create: ingredients.map((i) => ({ ingredientId: i.id })),
          },
        },
      });
    });

    return this.get(userId);
  }

  async update(userId: string, dto: UpdateMeDto): Promise<MeDto> {
    if (dto.displayName !== undefined) {
      await this.prisma.profile.update({
        where: { userId },
        data: { displayName: dto.displayName },
      });
    }
    return this.get(userId);
  }

  /** Hard delete (App Store / Google Play requirement, GDPR). Cascades to every user table. */
  async delete(userId: string): Promise<void> {
    await this.prisma.user.deleteMany({ where: { id: userId } });
  }
}

function toMeDto(
  user: UserWithProfile,
  p: NonNullable<UserWithProfile['profile']>,
  avoidIngredientNames: MeDto['profile']['avoidIngredientNames'],
): MeDto {
  const quiz = p.quizAnswers as unknown as QuizAnswers | null;
  return {
    id: user.id,
    email: user.email,
    isGuest: user.isGuest,
    createdAt: user.createdAt.toISOString(),
    profile: {
      displayName: p.displayName,
      locale: p.locale,
      skinType: p.skinType,
      oilLevel: p.oilLevel,
      barrierLevel: p.barrierLevel,
      sensitivityLevel: p.sensitivityLevel,
      isSensitive: p.isSensitive,
      concerns: p.concerns.map((c) => c.concern.code) as MeDto['profile']['concerns'],
      avoidGroups: p.avoidedGroups.map((g) => g.group.code) as MeDto['profile']['avoidGroups'],
      avoidIngredients: quiz?.avoidIngredients ?? [],
      avoidIngredientNames,
      mustHaves: p.mustHaves as MeDto['profile']['mustHaves'],
      usesSpf: p.usesSpf,
      budget: p.budget ? fromDbBudget[p.budget] : null,
      quizAnswers: quiz,
      onboardedAt: p.onboardedAt?.toISOString() ?? null,
    },
  };
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/(^|[\s/(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
