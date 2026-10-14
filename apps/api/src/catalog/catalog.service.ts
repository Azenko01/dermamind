import { productFlags, type MatchResult } from '@dermamind/scoring';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableProductInclude,
  type ScorableProduct,
} from '../scoring/scoring.service';
import type {
  MatchSummaryDto,
  ProductDetailDto,
  ProductListDto,
  ProductListItemDto,
  ProductsQueryDto,
} from './dto/products.dto';

/**
 * Polish words people type for a product type. Product names from Sa.Sha's DB are English, so
 * "krem" alone would find nothing.
 */
const CATEGORY_WORDS: [string, string[]][] = [
  ['krem', ['moisturizer', 'eye_cream', 'sunscreen']],
  ['tonik', ['toner']],
  ['serum', ['serum']],
  ['esencj', ['essence']],
  ['żel', ['cleanser']],
  ['zel', ['cleanser']],
  ['piank', ['cleanser']],
  ['emulsj', ['cleanser']],
  ['micel', ['cleanser']],
  ['oczyszcz', ['cleanser']],
  ['mycia', ['cleanser']],
  ['filtr', ['sunscreen']],
  ['spf', ['sunscreen']],
  ['olej', ['oil']],
  ['maseczk', ['mask']],
  ['masecz', ['mask']],
  ['peeling', ['exfoliant']],
];

function categoriesFor(token: string): string[] {
  const t = token.toLowerCase();
  return [
    ...new Set(
      CATEGORY_WORDS.filter(([w]) => t.startsWith(w) || (w.startsWith(t) && t.length >= 3)).flatMap(
        ([, c]) => c,
      ),
    ),
  ];
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {}

  /**
   * Search + filter in SQL, score in memory. Sorting by score needs the score of every match, which
   * is fine for our catalogue size (hundreds of products, PLAN.md 4.4); beyond that we'd store
   * per-user scores.
   */
  async list(query: ProductsQueryDto, userId?: string): Promise<ProductListDto> {
    const ids = await this.searchIds(query);
    const [products, profile] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: ids } }, include: scorableProductInclude }),
      this.scoring.profileFor(userId),
    ]);

    const rows = products.map((p) => ({
      product: p,
      match: profile ? this.scoring.score(profile, p) : null,
    }));
    const sort = query.sort ?? (profile ? 'score' : 'name');
    const byName = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
      a.product.name.localeCompare(b.product.name, 'pl');
    const price = (r: (typeof rows)[number]) => r.product.pricePln?.toNumber() ?? null;
    rows.sort((a, b) => {
      if (sort === 'score') return (b.match?.score ?? -1) - (a.match?.score ?? -1) || byName(a, b);
      if (sort === 'price_asc' || sort === 'price_desc') {
        const pa = price(a);
        const pb = price(b);
        if (pa === null || pb === null) return pa === pb ? byName(a, b) : pa === null ? 1 : -1;
        return (sort === 'price_asc' ? pa - pb : pb - pa) || byName(a, b);
      }
      return byName(a, b);
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: rows.slice(start, start + query.pageSize).map((r) => toListItem(r.product, r.match)),
      total: rows.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: number, userId?: string): Promise<ProductDetailDto> {
    const [product, profile] = await Promise.all([
      this.prisma.product.findFirst({
        where: { id, isPublished: true },
        include: scorableProductInclude,
      }),
      this.scoring.profileFor(userId),
    ]);
    if (!product) throw new NotFoundException('Product not found');

    const match = profile ? this.scoring.score(profile, product) : null;
    const rating = new Map(match?.ingredients.map((i) => [i.ingredientId, i.rating]));
    return {
      ...toListItem(product, match),
      sourceUrl: product.sourceUrl,
      flags: productFlags(
        product.ingredients.map((pi) => pi.ingredient),
        product.inciComplete,
        product.brand?.crueltyFree ?? null,
      ),
      ingredients: product.ingredients.map(({ position, ingredient: i }) => ({
        id: i.id,
        position,
        inciName: i.inciName,
        displayName: i.displayName,
        functions: i.functions,
        comedogenic: i.comedogenic,
        isFungalAcneTrigger: i.isFungalAcneTrigger,
        isEuAllergen: i.isEuAllergen,
        isFragrance: i.isFragrance,
        rating: rating.get(i.id) ?? null,
      })),
      match: match
        ? {
            ...summary(match),
            confidence: match.confidence,
            pros: match.pros,
            cons: match.cons,
            excludedBy: match.excludedBy,
          }
        : null,
    };
  }

  /**
   * Every word must match the start of a word in the product name (tsvector from PLAN.md 3.2), the
   * brand, or a Polish category word: "pharm rosa" finds Pharmaceris R Puri-Rosalgin, "krem
   * bielenda" finds Bielenda creams.
   */
  private async searchIds({ q, category }: ProductsQueryDto): Promise<number[]> {
    const tokens = (q?.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 8);
    const textFilter = tokens.length
      ? Prisma.sql`AND ${Prisma.join(
          tokens.map((t) => {
            const cats = categoriesFor(t);
            const byCategory = cats.length
              ? Prisma.sql` OR p.category::text IN (${Prisma.join(cats)})`
              : Prisma.empty;
            return Prisma.sql`(p.search @@ to_tsquery('simple', ${`${t}:*`}) OR b.name ILIKE ${`${t}%`} OR b.name ILIKE ${`% ${t}%`}${byCategory})`;
          }),
          ' AND ',
        )}`
      : Prisma.empty;
    const categoryFilter = category
      ? Prisma.sql`AND p.category = ${category}::product_category`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.is_published ${textFilter} ${categoryFilter}`;
    return rows.map((r) => r.id);
  }
}

function summary(m: MatchResult): MatchSummaryDto {
  return { score: m.score, status: m.status, label: m.label, lowConfidence: m.lowConfidence };
}

function toListItem(p: ScorableProduct, match: MatchResult | null): ProductListItemDto {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand?.name ?? null,
    category: p.category,
    pricePln: p.pricePln?.toNumber() ?? null,
    imageUrl: p.imageUrl,
    inciComplete: p.inciComplete,
    match: match ? summary(match) : null,
  };
}
