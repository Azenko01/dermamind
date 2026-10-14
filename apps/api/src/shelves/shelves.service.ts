import { Injectable, NotFoundException } from '@nestjs/common';
import { toListItem } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService, scorableProductInclude } from '../scoring/scoring.service';
import { SHELF_KINDS, type ShelvesDto, type SystemShelfKind } from './shelves.dto';

/** "Lubię" and "Unikam" exclude each other; "Mam" goes with either. */
const OPPOSITE: Partial<Record<SystemShelfKind, SystemShelfKind>> = {
  like: 'avoid',
  avoid: 'like',
};

/** Półka T4 (PLAN.md 3.6, 6.2): Mam, Lubię, Unikam. Products on "Unikam" count as excluded. */
@Injectable()
export class ShelvesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  async list(userId: string): Promise<ShelvesDto> {
    const shelves = await this.ensure(userId);
    const [items, profile] = await Promise.all([
      this.prisma.shelfItem.findMany({
        where: { shelfId: { in: shelves.map((s) => s.id) }, product: { isPublished: true } },
        orderBy: { addedAt: 'desc' },
        include: { product: { include: scorableProductInclude } },
      }),
      this.scoring.profileFor(userId),
    ]);
    return {
      shelves: SHELF_KINDS.map((kind) => {
        const shelf = shelves.find((s) => s.kind === kind)!;
        return {
          kind,
          items: items
            .filter((i) => i.shelfId === shelf.id)
            .map((i) => ({
              addedAt: i.addedAt.toISOString(),
              product: toListItem(
                i.product,
                profile ? this.scoring.score(profile, i.product) : null,
              ),
            })),
        };
      }),
    };
  }

  async add(userId: string, kind: SystemShelfKind, productId: number): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isPublished: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    const shelves = await this.ensure(userId);
    const shelf = shelves.find((s) => s.kind === kind)!;
    const opposite = OPPOSITE[kind] ? shelves.find((s) => s.kind === OPPOSITE[kind]) : undefined;
    await this.prisma.$transaction([
      ...(opposite
        ? [this.prisma.shelfItem.deleteMany({ where: { shelfId: opposite.id, productId } })]
        : []),
      this.prisma.shelfItem.upsert({
        where: { shelfId_productId: { shelfId: shelf.id, productId } },
        create: { shelfId: shelf.id, productId },
        update: {},
      }),
    ]);
  }

  async remove(userId: string, kind: SystemShelfKind, productId: number): Promise<void> {
    await this.prisma.shelfItem.deleteMany({ where: { productId, shelf: { userId, kind } } });
  }

  /** System shelves are created at sign-up; this also repairs accounts that lack one. */
  private async ensure(userId: string) {
    const existing = await this.prisma.shelf.findMany({
      where: { userId, kind: { in: [...SHELF_KINDS] } },
    });
    const missing = SHELF_KINDS.filter((k) => !existing.some((s) => s.kind === k));
    if (missing.length === 0) return existing;
    await this.prisma.shelf.createMany({ data: missing.map((kind) => ({ userId, kind })) });
    return this.prisma.shelf.findMany({ where: { userId, kind: { in: [...SHELF_KINDS] } } });
  }
}
