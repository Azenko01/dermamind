-- Open Beauty Facts import and products added from the scanner (Sprint 3, feat/barcodes-light-theme).
-- products.barcode already has a unique index (init migration), so EAN upserts are safe.

CREATE TYPE "product_source" AS ENUM ('curated', 'obf', 'user');

-- Free-text source → enum. Everything imported so far is our hand-checked catalogue ('hebe').
ALTER TABLE "products"
  ALTER COLUMN "source" TYPE "product_source"
    USING (CASE WHEN "source" = 'user_submission' THEN 'user' ELSE 'curated' END)::"product_source",
  ALTER COLUMN "source" SET DEFAULT 'curated',
  ALTER COLUMN "source" SET NOT NULL;

ALTER TABLE "products"
  ADD COLUMN "is_polish_market" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "obf_last_modified" TIMESTAMPTZ,
  ADD COLUMN "inci_unknown" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "created_by_id" UUID,
  ADD COLUMN "needs_review" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "products_source_idx" ON "products"("source");
CREATE INDEX "products_created_by_id_idx" ON "products"("created_by_id");

ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A user product always has an owner; other sources never do.
ALTER TABLE "products" ADD CONSTRAINT "products_user_owner_check"
  CHECK (("source" = 'user') = ("created_by_id" IS NOT NULL));

CREATE TABLE "obf_misses" (
    "barcode" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "obf_misses_pkey" PRIMARY KEY ("barcode")
);
