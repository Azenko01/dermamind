-- OBF ingredients taxonomy (CosIng-based), CosIng annex exports, fuzzy INCI matches, non-skincare categories.
-- CreateEnum
CREATE TYPE "ingredient_source" AS ENUM ('curated', 'obf_taxonomy', 'cosing');

-- CreateEnum
CREATE TYPE "inci_match" AS ENUM ('exact', 'fuzzy');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "product_category" ADD VALUE 'makeup';
ALTER TYPE "product_category" ADD VALUE 'hair_care';
ALTER TYPE "product_category" ADD VALUE 'body_care';
ALTER TYPE "product_category" ADD VALUE 'oral_care';
ALTER TYPE "product_category" ADD VALUE 'deodorant';

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "annex_refs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cas_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cosing_functions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cosing_ref" TEXT,
ADD COLUMN     "ec_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_prohibited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_restricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "ingredient_source" NOT NULL DEFAULT 'curated';

-- AlterTable
ALTER TABLE "ingredient_aliases" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'curated';

-- AlterTable
ALTER TABLE "product_ingredients" ADD COLUMN     "match" "inci_match" NOT NULL DEFAULT 'exact',
ADD COLUMN     "matched_from" TEXT;


ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_source_check"
  CHECK ("source" IN ('curated', 'obf_taxonomy', 'cosing', 'reviewed'));
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_matched_from_check"
  CHECK (("match" = 'fuzzy') = ("matched_from" IS NOT NULL));
CREATE INDEX "ingredients_cosing_ref_idx" ON "ingredients"("cosing_ref");
