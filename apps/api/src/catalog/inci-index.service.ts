import type { FuzzyIndex } from '@dermamind/scoring';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { loadFuzzyIndex } from './product-writer';

/**
 * The typo-tolerant index over all ingredient names and aliases (~50 000 short strings), kept in
 * memory and rebuilt only when the dictionary changed (an import ran) — checked with one cheap
 * aggregate query per use.
 */
@Injectable()
export class InciIndexService {
  private index: Promise<FuzzyIndex<{ id: number }>> | null = null;
  private version = '';

  constructor(private readonly prisma: PrismaService) {}

  async fuzzy(): Promise<FuzzyIndex<{ id: number }>> {
    const [v] = await this.prisma.$queryRaw<{ v: string }[]>`
      SELECT concat_ws(':', (SELECT count(*) FROM ingredients), (SELECT max(id) FROM ingredients),
        (SELECT count(*) FROM ingredient_aliases)) AS v`;
    if (!this.index || v?.v !== this.version) {
      this.version = v?.v ?? '';
      this.index = loadFuzzyIndex(this.prisma).catch((err: unknown) => {
        this.index = null;
        throw err;
      });
    }
    return this.index;
  }
}
