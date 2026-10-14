-- AlterTable
ALTER TABLE "products" ADD COLUMN     "inci_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "products_source_url_key" ON "products"("source_url");


-- Sa.Sha's "barrier_damage" problem; the Match Score adds it for a weakened barrier (barrier_level ≥ 2).
INSERT INTO "skin_concerns" ("id", "code") VALUES (14, 'barrier');
