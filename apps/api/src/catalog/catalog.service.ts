import { normalizeObfProduct, productFlags, type MatchResult } from '@dermamind/scoring';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ScoringService,
  scorableProductInclude,
  type ScorableProduct,
} from '../scoring/scoring.service';
import { InciIndexService } from './inci-index.service';
import { ObfClient } from './obf.client';
import {
  brandId,
  inciDictionaryFor,
  linkInci,
  obfProductData,
  writeIngredients,
} from './product-writer';
import type {
  CreateUserProductDto,
  MatchDetailDto,
  MatchSummaryDto,
  ProductDetailDto,
  ProductIngredientDto,
  ProductListDto,
  ProductListItemDto,
  ProductsQueryDto,
} from './dto/products.dto';
import type { ScanListDto } from './dto/scans.dto';

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
    private readonly obf: ObfClient,
    private readonly inciIndex: InciIndexService,
  ) {}

  /**
   * Search + filter in SQL, score in memory. Sorting by score needs the score of every match, which
   * is fine for our catalogue size (hundreds of products, PLAN.md 4.4); beyond that we'd store
   * per-user scores.
   */
  async list(query: ProductsQueryDto, userId?: string): Promise<ProductListDto> {
    const ids = await this.searchIds(query, userId);
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
        where: { id, ...visibleTo(userId) },
        include: scorableProductInclude,
      }),
      this.scoring.profileFor(userId),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    return this.detail(product, profile, userId);
  }

  /**
   * Scanner lookup (PLAN.md 6.5 flow 2): the user's own product with this code → our catalogue →
   * Open Beauty Facts (saved as source = obf) → 404. A code OBF didn't know isn't asked again for
   * 24 h. Every scan of a signed-in user goes to scan_history — also unknown codes, so the team
   * sees what people look for.
   */
  async byEan(ean: string, userId?: string): Promise<ProductDetailDto> {
    const profilePromise = this.scoring.profileFor(userId);
    const product =
      (userId
        ? await this.prisma.product.findUnique({
            where: { createdById_userBarcode: { createdById: userId, userBarcode: ean } },
            include: scorableProductInclude,
          })
        : null) ?? (await this.catalogByEan(ean));

    if (userId) {
      await this.prisma.scanHistory.create({
        data: { userId, barcode: ean, productId: product?.id ?? null },
      });
    }
    if (!product) throw new NotFoundException('No product with this barcode');
    return this.detail(product, await profilePromise, userId);
  }

  private async catalogByEan(ean: string): Promise<ScorableProduct | null> {
    const row = await this.prisma.product.findUnique({
      where: { barcode: ean },
      include: scorableProductInclude,
    });
    // OBF rows without an ingredient list are unpublished but still answer a scan; any other
    // hidden row keeps its code to itself (and must never be overwritten by an OBF record)
    if (row) return row.isPublished || row.source === 'obf' ? row : null;
    return this.fromObf(ean);
  }

  private async fromObf(ean: string): Promise<ScorableProduct | null> {
    const miss = await this.prisma.obfMiss.findUnique({ where: { barcode: ean } });
    if (miss && Date.now() - miss.checkedAt.getTime() < OBF_MISS_TTL_MS) return null;

    const lookup = await this.obf.product(ean);
    if (lookup.kind === 'unavailable') return null; // try again next time
    const p = lookup.kind === 'found' ? normalizeObfProduct(lookup.record) : null;
    if (!p) {
      await this.prisma.obfMiss.upsert({
        where: { barcode: ean },
        create: { barcode: ean },
        update: { checkedAt: new Date() },
      });
      return null;
    }

    const fuzzy = await this.inciIndex.fuzzy();
    return this.prisma.$transaction(async (tx) => {
      const linked = linkInci(p.inciRaw, await inciDictionaryFor(tx, p.inciRaw, fuzzy));
      // without a list nothing can be scored: keep it out of search until someone adds one
      const data = {
        ...obfProductData(p, await brandId(tx, p.brand), linked),
        isPublished: linked.ingredients.length + linked.unknown.length > 0,
      };
      // two people scanning the same new code at once: the second one just updates the row
      const row = await tx.product.upsert({ where: { barcode: ean }, create: data, update: data });
      await writeIngredients(tx, row.id, linked);
      await tx.obfMiss.deleteMany({ where: { barcode: ean } });
      return tx.product.findUniqueOrThrow({
        where: { id: row.id },
        include: scorableProductInclude,
      });
    });
  }

  /**
   * "Dodaj produkt" after a scan: the user's own product (source = user), visible only to them
   * until the team checks it (needsReview). Adding the same code again updates their product.
   */
  async createUserProduct(userId: string, dto: CreateUserProductDto): Promise<ProductDetailDto> {
    const obfRow = dto.ean
      ? await this.prisma.product.findFirst({
          where: { barcode: dto.ean, source: 'obf' },
          select: { imageUrl: true, category: true },
        })
      : null;
    const fuzzy = await this.inciIndex.fuzzy();
    const product = await this.prisma.$transaction(async (tx) => {
      const linked = linkInci(dto.inciRaw, await inciDictionaryFor(tx, dto.inciRaw, fuzzy));
      const data = {
        name: dto.name,
        brandId: await brandId(tx, dto.brand ?? null),
        category: dto.category ?? obfRow?.category ?? 'other',
        // the photo can only come from the Open Beauty Facts record of the same code
        imageUrl: obfRow?.imageUrl ?? null,
        source: 'user' as const,
        createdById: userId,
        userBarcode: dto.ean ?? null,
        inciRaw: dto.inciRaw,
        inciUnknown: linked.unknown,
        inciComplete: linked.ingredients.length > 0 && linked.unknown.length === 0,
        isPublished: false,
        needsReview: true,
      };
      const row = dto.ean
        ? await tx.product.upsert({
            where: { createdById_userBarcode: { createdById: userId, userBarcode: dto.ean } },
            create: data,
            update: data,
          })
        : await tx.product.create({ data });
      await writeIngredients(tx, row.id, linked);
      return tx.product.findUniqueOrThrow({
        where: { id: row.id },
        include: scorableProductInclude,
      });
    });
    return this.detail(product, await this.scoring.profileFor(userId), userId);
  }

  private async detail(
    product: ScorableProduct,
    profile: Awaited<ReturnType<ScoringService['profileFor']>>,
    userId: string | undefined,
  ): Promise<ProductDetailDto> {
    const hasList = product.ingredients.length + product.inciUnknown.length > 0;
    return toDetail(
      product,
      profile && hasList ? this.scoring.score(profile, product) : null,
      await this.myShelves(userId, product.id),
    );
  }

  /** System shelves ("Mam", "Lubię", "Unikam") this product is on — for the D1 buttons. */
  private async myShelves(
    userId: string | undefined,
    productId: number,
  ): Promise<ProductDetailDto['myShelves']> {
    if (!userId) return [];
    const rows = await this.prisma.shelfItem.findMany({
      where: { productId, shelf: { userId, kind: { in: ['own', 'like', 'avoid'] } } },
      select: { shelf: { select: { kind: true } } },
    });
    return (['own', 'like', 'avoid'] as const).filter((k) => rows.some((r) => r.shelf.kind === k));
  }

  async scans(userId: string, page: number, pageSize: number): Promise<ScanListDto> {
    const [rows, total, profile] = await Promise.all([
      this.prisma.scanHistory.findMany({
        where: { userId },
        orderBy: [{ scannedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: { include: scorableProductInclude } },
      }),
      this.prisma.scanHistory.count({ where: { userId } }),
      this.scoring.profileFor(userId),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        barcode: r.barcode,
        scannedAt: r.scannedAt.toISOString(),
        product:
          r.product && (isVisible(r.product, userId) || r.product.source === 'obf')
            ? toListItem(r.product, profile ? this.scoring.score(profile, r.product) : null)
            : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Every word must match the start of a word in the product name (tsvector from PLAN.md 3.2), the
   * brand, or a Polish category word: "pharm rosa" finds Pharmaceris R Puri-Rosalgin, "krem
   * bielenda" finds Bielenda creams.
   *
   * Browsing without a search text shows our curated catalogue (+ the user's own products); the
   * ~13 000 Open Beauty Facts rows only come up when searching, capped at SEARCH_CAP candidates —
   * curated first, then the Polish market, then complete lists — because every candidate is scored
   * in memory.
   */
  private async searchIds({ q, category }: ProductsQueryDto, userId?: string): Promise<number[]> {
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
    const own = userId ? Prisma.sql`OR p.created_by_id = ${userId}::uuid` : Prisma.empty;
    const scope = tokens.length
      ? Prisma.sql`(p.is_published ${own})`
      : Prisma.sql`((p.is_published AND p.source = 'curated') ${own})`;
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id FROM products p LEFT JOIN brands b ON b.id = p.brand_id
      WHERE ${scope} ${textFilter} ${categoryFilter}
      ORDER BY (p.source = 'user') DESC, (p.source = 'curated') DESC, p.is_polish_market DESC,
        p.inci_complete DESC, p.id
      LIMIT ${SEARCH_CAP}`;
    return rows.map((r) => r.id);
  }
}

/** Most candidates a search scores in memory (PLAN.md 4.4). */
const SEARCH_CAP = 300;

/** Open Beauty Facts "not found" is remembered this long (PLAN.md 6.5, OBF rate limits). */
export const OBF_MISS_TTL_MS = 24 * 60 * 60 * 1000;

/** Published catalogue + the user's own products (source = user, not moderated yet). */
function visibleTo(userId: string | undefined): Prisma.ProductWhereInput {
  return userId ? { OR: [{ isPublished: true }, { createdById: userId }] } : { isPublished: true };
}

function isVisible(p: { isPublished: boolean; createdById: string | null }, userId?: string) {
  return p.isPublished || (userId !== undefined && p.createdById === userId);
}

export function toIngredientRow(
  position: number,
  i: ScorableProduct['ingredients'][number]['ingredient'],
  rating: ProductIngredientDto['rating'],
  fuzzyFrom: string | null = null,
): ProductIngredientDto {
  return {
    id: i.id,
    position,
    inciName: i.inciName,
    displayName: i.displayName,
    functions: i.functions,
    comedogenic: i.comedogenic,
    isFungalAcneTrigger: i.isFungalAcneTrigger,
    isEuAllergen: i.isEuAllergen,
    isFragrance: i.isFragrance,
    rating,
    fuzzyFrom,
  };
}

export function toMatchDetail(m: MatchResult): MatchDetailDto {
  return {
    ...summary(m),
    confidence: m.confidence,
    avoidedByUser: m.avoidedByUser,
    pros: m.pros,
    cons: m.cons,
    excludedBy: m.excludedBy,
  };
}

function toDetail(
  product: ScorableProduct,
  match: MatchResult | null,
  myShelves: ProductDetailDto['myShelves'] = [],
): ProductDetailDto {
  const rating = new Map(match?.ingredients.map((i) => [i.ingredientId, i.rating]));
  return {
    ...toListItem(product, match),
    sourceUrl: product.sourceUrl,
    source: product.source,
    barcode: product.barcode ?? product.userBarcode,
    isPolishMarket: product.isPolishMarket,
    hasIngredientList: product.ingredients.length + product.inciUnknown.length > 0,
    unknownIngredients: product.inciUnknown,
    needsReview: product.needsReview,
    myShelves,
    flags: productFlags(
      product.ingredients.map((pi) => pi.ingredient),
      product.inciComplete,
      product.brand?.crueltyFree ?? null,
    ),
    ingredients: product.ingredients.map(({ position, ingredient, matchedFrom }) =>
      toIngredientRow(position, ingredient, rating.get(ingredient.id) ?? null, matchedFrom),
    ),
    match: match ? toMatchDetail(match) : null,
  };
}

export function summary(m: MatchResult): MatchSummaryDto {
  return { score: m.score, status: m.status, label: m.label, lowConfidence: m.lowConfidence };
}

export function toListItem(p: ScorableProduct, match: MatchResult | null): ProductListItemDto {
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
