-- Products added from the scanner keep their EAN per owner (see schema.prisma Product.userBarcode).
ALTER TABLE "products" ADD COLUMN "user_barcode" TEXT;

DROP INDEX "products_created_by_id_idx";
CREATE UNIQUE INDEX "products_created_by_id_user_barcode_key" ON "products"("created_by_id", "user_barcode");

ALTER TABLE "products" ADD CONSTRAINT "products_user_barcode_check"
  CHECK ("user_barcode" IS NULL OR "source" = 'user');
