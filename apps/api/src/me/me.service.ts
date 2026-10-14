import { computeSkinProfile, type Budget, type QuizAnswers } from '@dermamind/scoring';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Budget as DbBudget, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MeDto } from './dto/me.dto';

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

/** `ingredient_aliases.alias` is stored lower-case without spaces (PLAN.md 3.1). */
const aliasKey = (inci: string) => inci.toLowerCase().replace(/\s+/g, '');

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
    return toMeDto(user, user.profile);
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

  /** Hard delete (App Store / Google Play requirement, GDPR). Cascades to every user table. */
  async delete(userId: string): Promise<void> {
    await this.prisma.user.deleteMany({ where: { id: userId } });
  }
}

function toMeDto(user: UserWithProfile, p: NonNullable<UserWithProfile['profile']>): MeDto {
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
      mustHaves: p.mustHaves as MeDto['profile']['mustHaves'],
      usesSpf: p.usesSpf,
      budget: p.budget ? fromDbBudget[p.budget] : null,
      quizAnswers: quiz,
      onboardedAt: p.onboardedAt?.toISOString() ?? null,
    },
  };
}
